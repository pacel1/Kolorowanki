import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface SitemapPage {
  slug: string;
  locale: string | null;
  createdAt: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  let pages: SitemapPage[] = [];

  try {
    const res = await fetch(`${API_BASE}/sitemap/pages?locale=pl`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json() as { pages: SitemapPage[] };
      pages = data.pages ?? [];
    }
  } catch {
    // Return empty sitemap on API error
  }

  const urls = pages
    .map((page) => {
      const locale = page.locale ?? 'pl';
      const loc = escapeXml(`${SITE_URL}/${locale}/coloring/${page.slug}`);
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
