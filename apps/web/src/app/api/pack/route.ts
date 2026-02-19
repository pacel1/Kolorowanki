import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@coloring/db';
import { Queue } from 'bullmq';

const MAX_PAGES = 50;
const QUEUE_NAME = 'pdf-pack';

function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
  };
}

// POST /api/pack
// Body: { pages: string[] }
// Creates a PackJob in DB and enqueues it to BullMQ pdf-pack queue.
// If enqueue fails, returns 202 with job in PENDING status (no 500).
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const pages = (body as { pages?: unknown }).pages;

  if (!Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json(
      { error: 'pages must be a non-empty array of slugs' },
      { status: 400 }
    );
  }

  if (pages.length > MAX_PAGES) {
    return NextResponse.json(
      { error: `pages must contain at most ${MAX_PAGES} slugs` },
      { status: 400 }
    );
  }

  // Create PackJob in DB
  let job: { id: string; status: string; pages: string[]; resultUrl: string | null; createdAt: Date; updatedAt: Date };
  try {
    job = await prisma.packJob.create({
      data: { pages: pages as string[] },
    });
  } catch (err) {
    console.error('[api/pack] Failed to create PackJob', err);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  // Enqueue to BullMQ – best-effort, do not fail the request if Redis is down
  try {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const queue = new Queue(QUEUE_NAME, { connection: parseRedisUrl(redisUrl) });
    await queue.add('pdf-pack', { jobId: job.id });
    await queue.close();
  } catch (err) {
    console.warn('[api/pack] Failed to enqueue job, leaving as PENDING', err);
  }

  return NextResponse.json({ job }, { status: 202 });
}
