import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { Worker, Job } from "bullmq";
import { prisma } from "@coloring/db";
import { createPackPdf } from "@coloring/pdf";
import { uploadBuffer, getPublicUrl } from "@coloring/storage";
import { createAiGenerateWorker } from "./queues/ai-generate.js";
import { createPromptGenerateWorker } from "./queues/prompt-generate.js";
import { createTranslatePageWorker } from "./queues/translate-page.js";
import { createLinkBoostWorker } from "./queues/link-boost.js";
import { createThinFixWorker } from "./queues/thin-fix.js";
import { createTranslateCategoriesWorker } from "./queues/translate-categories.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const QUEUE_NAME = "pdf-pack";

// Detect whether R2 is configured (all required env vars present)
function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_PUBLIC_BASE_URL
  );
}

// Fallback: local path inside apps/web/public/generated
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_OUTPUT_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "apps",
  "web",
  "public",
  "generated"
);

// Parse redis URL into host/port for BullMQ connection options
function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
  };
}

const redisConnection = parseRedisUrl(REDIS_URL);

// ─── Types ────────────────────────────────────────────────────────────────────

type PageRecord = { slug: string; imageUrl: string };

// ─── Storage helpers ──────────────────────────────────────────────────────────

/**
 * Saves the PDF buffer either to Cloudflare R2 (production) or to the local
 * filesystem under apps/web/public/generated (DEV fallback).
 *
 * @returns Public URL of the saved PDF.
 */
async function savePdf(jobId: string, pdfBuffer: Buffer): Promise<string> {
  const r2 = isR2Configured();

  if (r2) {
    // ── R2 upload ──────────────────────────────────────────────────────────
    const key = `pdf/${jobId}.pdf`;
    console.log(`[worker] uploading PDF to R2 key=${key}`);
    const url = await uploadBuffer(key, pdfBuffer, "application/pdf");
    console.log(`[worker] R2 upload done url=${url}`);
    return url;
  } else {
    // ── Local fallback (DEV) ───────────────────────────────────────────────
    await fs.mkdir(LOCAL_OUTPUT_DIR, { recursive: true });
    const outputPath = path.join(LOCAL_OUTPUT_DIR, `${jobId}.pdf`);
    await fs.writeFile(outputPath, pdfBuffer);
    const localUrl = `/generated/${jobId}.pdf`;
    console.log(`[worker] DEV mode – PDF saved locally path=${outputPath} url=${localUrl}`);
    return localUrl;
  }
}

// ─── Job processor ────────────────────────────────────────────────────────────

async function processJob(job: Job): Promise<void> {
  const jobId: string = (job.data?.jobId as string | undefined) ?? job.id ?? "";
  console.log(`[worker] processing job id=${jobId} r2=${isR2Configured()}`);

  // 1. Fetch PackJob from DB
  const packJob = await prisma.packJob.findUnique({ where: { id: jobId } });
  if (!packJob) {
    throw new Error(`PackJob not found: ${jobId}`);
  }

  // Mark as PROCESSING
  await prisma.packJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING" },
  });

  // 2. Fetch ColoringPage records for each slug in job.pages
  const pages = await prisma.coloringPage.findMany({
    where: { slug: { in: packJob.pages } },
    select: { slug: true, imageUrl: true },
  });

  if (pages.length === 0) {
    throw new Error(
      `No ColoringPages found for slugs: ${packJob.pages.join(", ")}`
    );
  }

  // Preserve original order from job.pages
  const typedPages = pages as PageRecord[];
  const orderedPages = packJob.pages
    .map((slug: string) => typedPages.find((p: PageRecord) => p.slug === slug))
    .filter((p): p is PageRecord => p !== undefined);

  // 3. Download images as Buffers
  const imageBuffers: Buffer[] = await Promise.all(
    orderedPages.map(async ({ slug, imageUrl }: PageRecord) => {
      const res = await fetch(imageUrl);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch image for slug=${slug}: ${res.status} ${res.statusText}`
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    })
  );

  // 4. Generate PDF
  const pdfBuffer = await createPackPdf({
    imageBuffers,
    pageSize: "A4",
    marginPt: 36,
  });

  // 5. Save PDF (R2 or local fallback) and get public URL
  const resultUrl = await savePdf(jobId, pdfBuffer);

  // 6. Update PackJob: status=DONE, resultUrl
  await prisma.packJob.update({
    where: { id: jobId },
    data: { status: "DONE", resultUrl },
  });

  console.log(`[worker] job done id=${jobId} resultUrl=${resultUrl}`);
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const jobId: string =
      (job.data?.jobId as string | undefined) ?? job.id ?? "unknown";
    try {
      await processJob(job);
    } catch (err) {
      console.error(`[worker] job failed id=${jobId}`, err);

      // Mark as FAILED in DB (best-effort)
      try {
        await prisma.packJob.update({
          where: { id: jobId },
          data: { status: "FAILED" },
        });
      } catch (dbErr) {
        console.error(
          `[worker] could not update status to FAILED for id=${jobId}`,
          dbErr
        );
      }

      throw err; // re-throw so BullMQ marks the job as failed
    }
  },
  { connection: redisConnection }
);

worker.on("completed", (job: Job) => {
  console.log(`[worker] BullMQ completed id=${job.id}`);
});

worker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`[worker] BullMQ failed id=${job?.id}`, err.message);
});

const mode = isR2Configured() ? "R2" : "LOCAL (DEV fallback)";
console.log(`[worker] listening on queue "${QUEUE_NAME}" … storage=${mode}`);

// ─── ai-generate worker ───────────────────────────────────────────────────────

createAiGenerateWorker(redisConnection);

// ─── prompt-generate worker ───────────────────────────────────────────────────

createPromptGenerateWorker(redisConnection);

// ─── translate-page worker ────────────────────────────────────────────────────

createTranslatePageWorker(redisConnection);

// ─── link-boost worker ────────────────────────────────────────────────────────

createLinkBoostWorker(redisConnection);

// ─── thin-fix worker ─────────────────────────────────────────────────────────

createThinFixWorker(redisConnection);

// ─── translate-categories worker ─────────────────────────────────────────────

createTranslateCategoriesWorker(redisConnection);
