import { NextResponse } from 'next/server';
import { prisma } from '@coloring/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const page = await prisma.coloringPage.findFirst({
      where: { slug, published: true, status: 'PUBLISHED' },
    });

    if (!page) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Failed to fetch page:', error);
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}
