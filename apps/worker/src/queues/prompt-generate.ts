import crypto from "node:crypto";
import { Worker, Queue, Job } from "bullmq";
import { prisma } from "@coloring/db";
import { generatePromptBatch } from "@coloring/ai/promptFactory.js";
import { AI_GENERATE_QUEUE } from "./ai-generate.js";
import type { SupportedLocale } from "@coloring/config/locales";

// ─── Queue names ──────────────────────────────────────────────────────────────

export const PROMPT_GENERATE_QUEUE = "prompt-generate";

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface PromptGeneratePayload {
  /** PromptCategory.id */
  categoryId: string;
  /** Override dailyQuota – if omitted, uses category.dailyQuota */
  count?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// ─── Processor ────────────────────────────────────────────────────────────────

async function processPromptGenerateJob(
  job: Job<PromptGeneratePayload>,
  connection: { host: string; port: number }
): Promise<void> {
  const { categoryId, count: payloadCount } = job.data;

  console.log(
    `[prompt-generate] start id=${job.id} categoryId=${categoryId} count=${payloadCount ?? "auto"}`
  );

  // 1. Fetch active PromptCategory
  const category = await prisma.promptCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error(`[prompt-generate] PromptCategory not found: ${categoryId}`);
  }

  if (!category.isActive) {
    console.log(`[prompt-generate] category ${categoryId} is inactive – skipping`);
    return;
  }

  const count = payloadCount ?? category.dailyQuota;
  console.log(
    `[prompt-generate] category="${category.slug}" locale="${category.locale}" count=${count}`
  );

  // 2. Call generatePromptBatch
  const items = await generatePromptBatch({
    category: category.slug,
    locale: category.locale as SupportedLocale,
    count,
    stylePreset: category.stylePreset ?? undefined,
    seedKeywords: category.seedKeywords,
    negativeKeywords: category.negativeKeywords,
  });

  console.log(`[prompt-generate] received ${items.length} prompts from AI`);

  // 3. Deduplicate by sha256(promptText) and save new records
  const aiGenerateQueue = new Queue(AI_GENERATE_QUEUE, { connection });

  let savedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const hash = sha256(item.promptText);

    // Check if hash already exists
    const existing = await prisma.generationPrompt.findUnique({
      where: { hash },
    });

    if (existing) {
      console.log(
        `[prompt-generate] SKIPPED duplicate hash=${hash.slice(0, 8)}… topic="${item.topic}"`
      );
      skippedCount++;
      continue;
    }

    // Save new GenerationPrompt as PENDING
    const prompt = await prisma.generationPrompt.create({
      data: {
        topic: item.topic,
        promptText: item.promptText,
        locale: category.locale,
        hash,
        status: "PENDING",
        attempts: 0,
        categoryId: category.id,
      },
    });

    console.log(
      `[prompt-generate] saved GenerationPrompt id=${prompt.id} topic="${item.topic}"`
    );

    // Enqueue to ai-generate queue
    await aiGenerateQueue.add(
      "generate",
      { generationPromptId: prompt.id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      }
    );

    // Update status to PROCESSING (queued)
    await prisma.generationPrompt.update({
      where: { id: prompt.id },
      data: { status: "PROCESSING" },
    });

    console.log(
      `[prompt-generate] enqueued to ai-generate id=${prompt.id}`
    );

    savedCount++;
  }

  console.log(
    `[prompt-generate] done categoryId=${categoryId} saved=${savedCount} skipped=${skippedCount}`
  );

  await aiGenerateQueue.close();
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createPromptGenerateWorker(connection: {
  host: string;
  port: number;
}): Worker<PromptGeneratePayload> {
  const worker = new Worker<PromptGeneratePayload>(
    PROMPT_GENERATE_QUEUE,
    async (job) => {
      // Increment attempts counter in DB (best-effort, categoryId may not map to a prompt yet)
      try {
        await processPromptGenerateJob(job, connection);
      } catch (err) {
        console.error(`[prompt-generate] job failed id=${job.id}`, err);
        throw err; // re-throw so BullMQ handles retry
      }
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(`[prompt-generate] completed id=${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[prompt-generate] failed id=${job?.id} attempt=${job?.attemptsMade}`,
      err.message
    );
  });

  console.log(
    `[prompt-generate] listening on queue "${PROMPT_GENERATE_QUEUE}" …`
  );

  return worker;
}
