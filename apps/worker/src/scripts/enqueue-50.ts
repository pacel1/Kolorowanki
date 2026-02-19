/**
 * Enqueues prompt-generate jobs for all active PromptCategories with count=50.
 * Usage: pnpm --filter worker tsx src/scripts/enqueue-50.ts
 */
import "dotenv/config";
import { Queue } from "bullmq";
import { prisma } from "@coloring/db";
import type { PromptGeneratePayload } from "../queues/prompt-generate.js";
import { PROMPT_GENERATE_QUEUE } from "../queues/prompt-generate.js";

const COUNT_OVERRIDE = 50;

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const parsed = new URL(REDIS_URL);
const connection = {
  host: parsed.hostname || "localhost",
  port: parsed.port ? parseInt(parsed.port, 10) : 6379,
};

const categories = await prisma.promptCategory.findMany({
  where: { isActive: true },
  orderBy: { createdAt: "asc" },
});

if (categories.length === 0) {
  console.warn("[enqueue-50] No active PromptCategories found");
  await prisma.$disconnect();
  process.exit(0);
}

const queue = new Queue<PromptGeneratePayload>(PROMPT_GENERATE_QUEUE, { connection });

for (const cat of categories) {
  const job = await queue.add("prompt-generate", {
    categoryId: cat.id,
    count: COUNT_OVERRIDE,
  });
  console.log(
    `[enqueue-50] enqueued id=${job.id} categoryId=${cat.id} slug=${cat.slug} count=${COUNT_OVERRIDE}`
  );
}

console.log(`[enqueue-50] done — ${categories.length} jobs enqueued`);
await queue.close();
await prisma.$disconnect();
