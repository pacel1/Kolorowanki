/**
 * thin-fix queue
 *
 * Finds ColoringPageTranslation rows that are "thin" (description < 120 chars,
 * missing seoTitle, or missing seoDescription) and regenerates the missing
 * fields using the AI tagger.  After saving, the page will pass the isThinPage
 * check and be promoted to index:true on the next render.
 *
 * Payload variants:
 *   { mode: "single", translationId }  – fix one specific translation
 *   { mode: "batch",  limit? }         – scan DB and fix up to `limit` thin rows
 *
 * The batch mode is designed to be run on a schedule (e.g. daily cron) so the
 * noindex count decreases over time without manual intervention.
 */

import { Worker, Job } from "bullmq";
import { prisma } from "@coloring/db";
import { generateThinFixMetadata } from "@coloring/ai/tagger.js";

// ─── Queue name ───────────────────────────────────────────────────────────────

export const THIN_FIX_QUEUE = "thin-fix";

// ─── Payload ──────────────────────────────────────────────────────────────────

export type ThinFixPayload =
  | { mode: "single"; translationId: string }
  | { mode: "batch"; limit?: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const DESCRIPTION_MIN_LENGTH = 120;
const DEFAULT_BATCH_LIMIT = 50;
const CONCURRENCY = parseInt(process.env.THIN_FIX_CONCURRENCY ?? "2", 10);

// ─── Thin check ───────────────────────────────────────────────────────────────

function isThin(tr: {
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}): boolean {
  return (
    !tr.seoTitle ||
    !tr.seoDescription ||
    !tr.description ||
    tr.description.length < DESCRIPTION_MIN_LENGTH
  );
}

// ─── DB types ─────────────────────────────────────────────────────────────────

interface TranslationRow {
  id: string;
  locale: string;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

// ─── Fix one translation ──────────────────────────────────────────────────────

async function fixTranslation(tr: TranslationRow): Promise<void> {
  console.log(
    `[thin-fix] fixing translationId=${tr.id} locale=${tr.locale} title="${tr.title}"`
  );

  const result = await generateThinFixMetadata(tr.title, tr.locale, {
    description: tr.description,
    seoTitle: tr.seoTitle,
    seoDescription: tr.seoDescription,
  });

  await (prisma as unknown as {
    coloringPageTranslation: { update: (args: unknown) => Promise<unknown> };
  }).coloringPageTranslation.update({
    where: { id: tr.id },
    data: {
      description: result.description,
      seoTitle: result.seoTitle,
      seoDescription: result.seoDescription,
    },
  });

  console.log(
    `[thin-fix] saved translationId=${tr.id} seoTitle="${result.seoTitle}"`
  );
}

// ─── Processor ────────────────────────────────────────────────────────────────

async function processThinFixJob(job: Job<ThinFixPayload>): Promise<void> {
  const db = prisma as unknown as {
    coloringPageTranslation: {
      findUnique: (args: unknown) => Promise<unknown>;
      findMany: (args: unknown) => Promise<unknown>;
    };
  };

  if (job.data.mode === "single") {
    // ── Single translation fix ─────────────────────────────────────────────
    const { translationId } = job.data;

    const tr = await db.coloringPageTranslation.findUnique({
      where: { id: translationId },
      select: {
        id: true,
        locale: true,
        title: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
      },
    }) as TranslationRow | null;

    if (!tr) {
      console.warn(`[thin-fix] translation not found id=${translationId}`);
      return;
    }

    if (!isThin(tr)) {
      console.log(
        `[thin-fix] translation id=${translationId} is not thin – skipping`
      );
      return;
    }

    await fixTranslation(tr);
  } else {
    // ── Batch fix ──────────────────────────────────────────────────────────
    const limit = job.data.limit ?? DEFAULT_BATCH_LIMIT;

    // Fetch rows with clearly missing fields (null / empty string)
    const candidates = await db.coloringPageTranslation.findMany({
      where: {
        page: { status: "PUBLISHED" },
        OR: [
          { seoTitle: null },
          { seoTitle: "" },
          { seoDescription: null },
          { seoDescription: "" },
          { description: null },
          { description: "" },
        ],
      },
      select: {
        id: true,
        locale: true,
        title: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
      },
      take: limit * 2, // over-fetch; JS-side length filter may reduce count
      orderBy: { id: "asc" },
    }) as TranslationRow[];

    // Also fetch rows where all fields are present but description may be short
    const allPresent = await db.coloringPageTranslation.findMany({
      where: {
        page: { status: "PUBLISHED" },
        seoTitle: { not: null },
        seoDescription: { not: null },
        description: { not: null },
      },
      select: {
        id: true,
        locale: true,
        title: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
      },
      take: limit * 2,
      orderBy: { id: "asc" },
    }) as TranslationRow[];

    // Merge, deduplicate, filter thin, cap at limit
    const seen = new Set<string>();
    const toFix: TranslationRow[] = [];

    for (const tr of [...candidates, ...allPresent]) {
      if (seen.has(tr.id)) continue;
      seen.add(tr.id);
      if (isThin(tr)) toFix.push(tr);
      if (toFix.length >= limit) break;
    }

    console.log(
      `[thin-fix] batch: found ${toFix.length} thin translations to fix (limit=${limit})`
    );

    let fixed = 0;
    let failed = 0;

    for (const tr of toFix) {
      try {
        await fixTranslation(tr);
        fixed++;
      } catch (err) {
        failed++;
        console.error(
          `[thin-fix] failed to fix translationId=${tr.id}`,
          err instanceof Error ? err.message : err
        );
        // Continue with remaining rows (partial-success strategy)
      }
    }

    console.log(`[thin-fix] batch done fixed=${fixed} failed=${failed}`);
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createThinFixWorker(connection: {
  host: string;
  port: number;
}): Worker<ThinFixPayload> {
  const worker = new Worker<ThinFixPayload>(
    THIN_FIX_QUEUE,
    async (job) => {
      await processThinFixJob(job);
    },
    {
      connection,
      concurrency: CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[thin-fix] completed id=${job.id} mode=${job.data.mode}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[thin-fix] failed id=${job?.id} attempt=${job?.attemptsMade}`,
      err.message
    );
  });

  console.log(
    `[thin-fix] listening on queue "${THIN_FIX_QUEUE}" concurrency=${CONCURRENCY}`
  );

  return worker;
}
