import { NextResponse } from 'next/server';
import { prisma } from '@coloring/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limitParam = searchParams.get('limit');
  const take = Math.min(Number(limitParam ?? 60), 200);

  try {
    const pages = await prisma.coloringPage.findMany({
      where: {
        published: true,
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        thumbUrl: true,
        imageUrl: true,
        published: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Failed to fetch pages:', error);
    return NextResponse.json({ pages: [], error: 'Database unavailable' }, { status: 503 });
  }
}
