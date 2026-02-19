import { NextResponse } from 'next/server';
import { prisma } from '@coloring/db';
import { SUPPORTED_LOCALES } from '@coloring/config/locales';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;

  // Validate locale
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Fetch all translations for this locale directly from DB
  let rows: Array<{ slug: string; page: { createdAt: Date } }> = [];

  try {
    rows = await (prisma as unknown as {
      coloringPageTranslation: {
        findMany: (args: unknown) => Promise<unknown>;
      };
    }).coloringPageTranslation.findMany({
      where: {
        locale,
        page: { published: true },
      },
      select: {
        slug: true,
        page: { select: { createdAt: true } },
      },
      orderBy: { page: { createdAt: 'desc' } },
    }) as Array<{ slug: string; page: { createdAt: Date } }>;
  } catch {
    // Return empty sitemap on DB error
  }

  const urls = rows
    .map(({ slug, page }) => {
      const loc = escapeXml(`${SITE_URL}/${locale}/coloring/${slug}`);
      const lastmod = new Date(page.createdAt).toISOString().split('T')[0];
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
