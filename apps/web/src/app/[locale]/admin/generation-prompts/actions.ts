'use server';

import { revalidatePath } from 'next/cache';
import { Queue } from 'bullmq';
import { prisma } from '@coloring/db';

// ─── Redis connection ─────────────────────────────────────────────────────────

function getRedisConnection(): { host: string; port: number } {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
  };
}

const AI_GENERATE_QUEUE = 'ai-generate';

// ─── Retry ────────────────────────────────────────────────────────────────────
// Sets status back to PENDING and enqueues to ai-generate

export async function retryGenerationPrompt(id: string, locale: string): Promise<void> {
  await prisma.generationPrompt.update({
    where: { id },
    data: { status: 'PENDING', attempts: 0 },
  });

  const queue = new Queue(AI_GENERATE_QUEUE, { connection: getRedisConnection() });
  await queue.add(
    'generate',
    { generationPromptId: id },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    }
  );
  await queue.close();

  revalidatePath(`/${locale}/admin/generation-prompts`);
}

// ─── Disable (SKIPPED) ────────────────────────────────────────────────────────

export async function disableGenerationPrompt(id: string, locale: string): Promise<void> {
  await prisma.generationPrompt.update({
    where: { id },
    data: { status: 'SKIPPED' },
  });

  revalidatePath(`/${locale}/admin/generation-prompts`);
}

// ─── Generate Now ─────────────────────────────────────────────────────────────
// Enqueues immediately without changing status (status will be updated by worker)

export async function generateNowPrompt(id: string, locale: string): Promise<void> {
  await prisma.generationPrompt.update({
    where: { id },
    data: { status: 'PROCESSING' },
  });

  const queue = new Queue(AI_GENERATE_QUEUE, { connection: getRedisConnection() });
  await queue.add(
    'generate',
    { generationPromptId: id },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    }
  );
  await queue.close();

  revalidatePath(`/${locale}/admin/generation-prompts`);
}
