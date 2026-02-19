import { NextResponse } from 'next/server';
import { prisma } from '@coloring/db';

export const dynamic = 'force-dynamic';

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  locale: string;
  translations: Array<{
    name: string;
    slug: string;
    locale: string;
  }>;
}

export async function GET(request: Request) {
  // Fixed locale - no i18n
  const locale = 'en';

  try {
    // 1. Fetch canonical categories with translations
    const categoryRows = await prisma.category.findMany({
      orderBy: { slug: 'asc' },
      include: {
        translations: {
          where: { locale },
        },
      },
    }) as CategoryRow[];

    // 2. Get page counts per canonical category
    const pageCounts = await prisma.coloringPage.groupBy({
      by: ['category'],
      where: { published: true, status: 'PUBLISHED' },
      _count: { id: true },
    });

    const countMap = new Map(pageCounts.map((r) => [r.category, r._count.id]));

    // 3. Merge: prefer translated name/slug when available
    const categories = categoryRows.map((cat) => {
      const tr = cat.translations[0];
      return {
        slug: tr?.slug ?? cat.slug,
        canonicalSlug: cat.slug,
        name: tr?.name ?? cat.name,
        count: countMap.get(cat.slug) ?? 0,
      };
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ categories: [], error: 'Database unavailable' }, { status: 503 });
  }
}
