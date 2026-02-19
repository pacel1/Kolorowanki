/**
 * generate-daily.ts
 *
 * Enqueues one prompt-generate job per active PromptCategory.
 * count = Math.ceil(category.dailyQuota * DAILY_QUOTA_MULTIPLIER)
 *
 * Safety guards:
 *   GENERATION_ENABLED=false  – aborts immediately, nothing is enqueued
 *   GLOBAL_DAILY_CAP=50       – total prompts enqueued today across all
 *                               categories is capped at this number
 *   DAILY_QUOTA_MULTIPLIER    – float multiplier on each category's dailyQuota
 *
 * Usage:
 *   pnpm --filter worker generate:daily
 *   DAILY_QUOTA_MULTIPLIER=2 pnpm --filter worker generate:daily
 */

import "dotenv/config";
import { Queue } from "bullmq";
import { prisma } from "@coloring/db";
import type { PromptGeneratePayload } from "../queues/prompt-generate.js";
import { PROMPT_GENERATE_QUEUE } from "../queues/prompt-generate.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

function isGenerationEnabled(): boolean {
  const val = (process.env.GENERATION_ENABLED ?? "true").toLowerCase();
  return val !== "false" && val !== "0";
}

const DAILY_QUOTA_MULTIPLIER = (() => {
  const raw = process.env.DAILY_QUOTA_MULTIPLIER;
  if (!raw) return 1.0;
  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) {
    console.warn(
      `[generate-daily] Invalid DAILY_QUOTA_MULTIPLIER="${raw}", using 1.0`
    );
    return 1.0;
  }
  return val;
})();

const GLOBAL_DAILY_CAP = (() => {
  const raw = process.env.GLOBAL_DAILY_CAP;
  if (!raw) return Infinity;
  const val = parseInt(raw, 10);
  if (isNaN(val) || val <= 0) {
    console.warn(
      `[generate-daily] Invalid GLOBAL_DAILY_CAP="${raw}", cap disabled`
    );
    return Infinity;
  }
  return val;
})();

function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Safety: GENERATION_ENABLED ──────────────────────────────────────────
  if (!isGenerationEnabled()) {
    console.warn(
      "[generate-daily] GENERATION_ENABLED=false – aborting, nothing enqueued"
    );
    return;
  }

  console.log(
    `[generate-daily] DAILY_QUOTA_MULTIPLIER=${DAILY_QUOTA_MULTIPLIER} GLOBAL_DAILY_CAP=${GLOBAL_DAILY_CAP}`
  );

  const connection = parseRedisUrl(REDIS_URL);
  const queue = new Queue<PromptGeneratePayload>(PROMPT_GENERATE_QUEUE, {
    connection,
  });

  // ── GLOBAL_DAILY_CAP: count prompts created today ───────────────────────
  let remainingCap = GLOBAL_DAILY_CAP;
  if (isFinite(GLOBAL_DAILY_CAP)) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const todayCount: number = await db.generationPrompt.count({
      where: { createdAt: { gte: startOfDay } },
    });

    remainingCap = Math.max(0, GLOBAL_DAILY_CAP - todayCount);
    console.log(
      `[generate-daily] GLOBAL_DAILY_CAP=${GLOBAL_DAILY_CAP} todayCount=${todayCount} remainingCap=${remainingCap}`
    );

    if (remainingCap === 0) {
      console.warn(
        "[generate-daily] Global daily cap reached – nothing enqueued"
      );
      await queue.close();
      await prisma.$disconnect();
      return;
    }
  }

  // Fetch all active categories
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const categories: Array<{
    id: string;
    slug: string;
    locale: string;
    dailyQuota: number;
  }> = await db.promptCategory.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, locale: true, dailyQuota: true },
  });

  if (categories.length === 0) {
    console.warn(
      "[generate-daily] No active PromptCategories found – nothing to enqueue"
    );
    await queue.close();
    await prisma.$disconnect();
    return;
  }

  console.log(
    `[generate-daily] Found ${categories.length} active categories`
  );

  // Build jobs respecting the remaining cap
  type JobEntry = {
    name: string;
    data: PromptGeneratePayload;
    opts: object;
  };

  const jobEntries: JobEntry[] = [];
  let capUsed = 0;

  for (const cat of categories) {
    if (isFinite(GLOBAL_DAILY_CAP) && capUsed >= remainingCap) {
      console.warn(
        `[generate-daily] Cap exhausted at category slug=${cat.slug} – stopping`
      );
      break;
    }

    const rawCount = Math.max(
      1,
      Math.ceil(cat.dailyQuota * DAILY_QUOTA_MULTIPLIER)
    );
    const count = isFinite(GLOBAL_DAILY_CAP)
      ? Math.min(rawCount, remainingCap - capUsed)
      : rawCount;

    if (count <= 0) break;

    jobEntries.push({
      name: "prompt-generate",
      data: { categoryId: cat.id, count } satisfies PromptGeneratePayload,
      opts: {
        attempts: 3,
        backoff: { type: "exponential" as const, delay: 15_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    });

    capUsed += count;
    console.log(
      `  → slug=${cat.slug} locale=${cat.locale} dailyQuota=${cat.dailyQuota} count=${count}`
    );
  }

  if (jobEntries.length === 0) {
    console.warn("[generate-daily] No jobs to enqueue after cap calculation");
    await queue.close();
    await prisma.$disconnect();
    return;
  }

  const jobs = await queue.addBulk(jobEntries);

  console.log(
    `[generate-daily] Enqueued ${jobs.length} prompt-generate jobs (totalCount≈${capUsed})`
  );

  await queue.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[generate-daily] fatal error", err);
  process.exit(1);
});
