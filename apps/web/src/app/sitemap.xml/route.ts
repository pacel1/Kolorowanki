import { NextResponse } from 'next/server';
import { SUPPORTED_LOCALES } from '@coloring/config/locales';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

export async function GET() {
  const now = new Date().toISOString().split('T')[0];

  // One coloring sitemap per locale
  const coloringSitemaps = SUPPORTED_LOCALES.map(
    (locale) => `  <sitemap>
    <loc>${SITE_URL}/sitemaps/coloring-${locale}.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
  ).join('\n');

  // Legacy sitemaps (kept for backwards compatibility)
  const legacySitemaps = `  <sitemap>
    <loc>${SITE_URL}/sitemaps/pages-pl.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemaps/tags-pl.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${coloringSitemaps}
${legacySitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
