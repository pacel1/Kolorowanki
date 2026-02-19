/**
 * One-shot test: enqueues a single prompt-generate job for the first active
 * PromptCategory found in the DB, then exits.
 *
 * Usage: pnpm --filter worker tsx src/scripts/enqueue-test.ts
 */
import "dotenv/config";
import { Queue } from "bullmq";
import { prisma } from "@coloring/db";
import type { PromptGeneratePayload } from "../queues/prompt-generate.js";
import { PROMPT_GENERATE_QUEUE } from "../queues/prompt-generate.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const parsed = new URL(REDIS_URL);
const connection = {
  host: parsed.hostname || "localhost",
  port: parsed.port ? parseInt(parsed.port, 10) : 6379,
};

// Find first active category
const category = await prisma.promptCategory.findFirst({
  where: { isActive: true },
  orderBy: { createdAt: "asc" },
});

if (!category) {
  console.error("[enqueue-test] No active PromptCategory found in DB");
  process.exit(1);
}

const queue = new Queue<PromptGeneratePayload>(PROMPT_GENERATE_QUEUE, { connection });

const job = await queue.add("prompt-generate", {
  categoryId: category.id,
  count: 2, // small test batch
});

console.log(
  `[enqueue-test] job enqueued id=${job.id} categoryId=${category.id} slug=${category.slug}`
);

await queue.close();
await prisma.$disconnect();
