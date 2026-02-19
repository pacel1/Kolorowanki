import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@coloring/db';

// GET /api/pack/[id]
// Returns PackJob by id directly from DB.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const job = await prisma.packJob.findUnique({ where: { id } });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err) {
    console.error('[api/pack/[id]] Failed to fetch PackJob', err);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
