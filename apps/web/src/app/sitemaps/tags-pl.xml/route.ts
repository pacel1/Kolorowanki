import { NextResponse } from 'next/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface SitemapTag {
  slug: string;
  locale: string;
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
  let tags: SitemapTag[] = [];

  try {
    const res = await fetch(`${API_BASE}/sitemap/tags?locale=pl`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json() as { tags: SitemapTag[] };
      tags = data.tags ?? [];
    }
  } catch {
    // Return empty sitemap on API error
  }

  const urls = tags
    .map((tag) => {
      const loc = escapeXml(`${SITE_URL}/${tag.locale}/tag/${tag.slug}`);
      return `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
