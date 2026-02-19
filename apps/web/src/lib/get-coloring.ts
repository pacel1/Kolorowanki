/**
 * Data access helpers – fetches from the Fastify API at /api/pages.
 * The API proxy in Next.js rewrites /api/* → http://localhost:4000/*.
 *
 * The API returns flat (single-language) records; we map them to the
 * LocalizedString shape used by the frontend so the rest of the UI
 * doesn't need to change when we add proper i18n to the API later.
 *
 * For locale-aware coloring page lookups (translation layer) we query
 * Prisma directly so we can join ColoringPageTranslation without adding
 * a new API endpoint.
 */

import type { Category, ColoringPage } from '@/types';
import { prisma } from '@coloring/db';
import { DEFAULT_LOCALE } from '@coloring/config/locales';
import { getBaseUrl } from './getBaseUrl';

// ─── API base URL ─────────────────────────────────────────────────────────────
// Use getBaseUrl() to support both browser and server environments
const getApiBase = () => getBaseUrl();

// ─── API response types ───────────────────────────────────────────────────────

interface ApiColoringPage {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  imageUrl: string;
  thumbUrl: string | null;
  published: boolean;
  createdAt: string;
}

export interface ApiTag {
  id: string;
  slug: string;
  name: string;
  locale: string;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapApiPage(p: ApiColoringPage): ColoringPage {
  return {
    id: p.id,
    slug: p.slug,
    // API currently stores Polish titles; mirror to both locales until i18n is added to API
    title: { pl: p.title, en: p.title },
    description: {
      pl: p.description ?? '',
      en: p.description ?? '',
    },
    categoryId: p.category,
    categorySlug: p.category,
    imageUrl: p.imageUrl,
    thumbnailUrl: p.thumbUrl ?? p.imageUrl,
    tags: p.tags,
    createdAt: p.createdAt,
  };
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  // Ensure path starts with /api prefix
  const apiPath = path.startsWith('/api') ? path : `/api${path}`;
  const url = `${getApiBase()}${apiPath}`;
  const res = await fetch(url, {
    cache: 'no-store', // always fetch fresh data – no ISR cache
  });
  if (!res.ok) {
    // Try to parse the body – the API may return a partial result (e.g. { pages: [] })
    // even on error status codes (503 = DB unavailable).
    const body = await res.json().catch(() => null);
    if (body !== null) return body as T;
    throw new Error(`API error ${res.status} for ${url}`);
  }
  return res.json() as Promise<T>;
}

// ─── Categories ───────────────────────────────────────────────────────────────
// Fetched from the /categories API endpoint (derived from published ColoringPages).

interface ApiCategory {
  slug: string;
  canonicalSlug?: string;
  name: string;
  count: number;
}

export async function getCategories(locale?: string): Promise<Category[]> {
  try {
    const qs = locale ? `?locale=${encodeURIComponent(locale)}` : '';
    const data = await apiFetch<{ categories: ApiCategory[] }>(`/categories${qs}`);
    return data.categories.map((c) => ({
      id: c.canonicalSlug ?? c.slug,
      // slug used for the /category/[slug] URL — use the translated slug
      slug: c.slug,
      // canonicalSlug used for filtering pages by category
      categorySlug: c.canonicalSlug ?? c.slug,
      name: { pl: c.name, en: c.name },
      description: { pl: '', en: '' },
      imageUrl: '',
      count: c.count,
    }));
  } catch {
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

// ─── Coloring pages ───────────────────────────────────────────────────────────

export async function getColoringPages(category?: string): Promise<ColoringPage[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const data = await apiFetch<{ pages: ApiColoringPage[] }>(`/pages${qs}`);
  return data.pages.map(mapApiPage);
}

export async function getColoringBySlug(slug: string): Promise<ColoringPage | null> {
  try {
    const data = await apiFetch<{ page: ApiColoringPage }>(`/pages/${encodeURIComponent(slug)}`);
    return mapApiPage(data.page);
  } catch {
    return null;
  }
}

export async function getColoringsByCategory(categorySlug: string): Promise<ColoringPage[]> {
  return getColoringPages(categorySlug);
}

export async function getFeaturedColorings(limit = 6): Promise<ColoringPage[]> {
  const data = await apiFetch<{ pages: ApiColoringPage[] }>(`/pages?limit=${limit}`);
  return data.pages.map(mapApiPage);
}

// ─── Static params helpers ────────────────────────────────────────────────────

export async function getAllColoringSlugs(): Promise<string[]> {
  try {
    const pages = await getColoringPages();
    return pages.map((p) => p.slug);
  } catch {
    // API not available at build time – return empty array (pages will be rendered on demand)
    return [];
  }
}

export async function getAllCategorySlugs(): Promise<string[]> {
  try {
    const categories = await getCategories();
    return categories.map((c) => c.slug);
  } catch {
    return [];
  }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getTagBySlug(tagSlug: string): Promise<ApiTag | null> {
  try {
    const data = await apiFetch<{ tag: ApiTag; pages: ApiColoringPage[] }>(
      `/pages/tag/${encodeURIComponent(tagSlug)}`
    );
    return data.tag ?? null;
  } catch {
    return null;
  }
}

export async function getColoringsByTag(tagSlug: string): Promise<ColoringPage[]> {
  try {
    const data = await apiFetch<{ tag: ApiTag | null; pages: ApiColoringPage[] }>(
      `/pages/tag/${encodeURIComponent(tagSlug)}`
    );
    return (data.pages ?? []).map(mapApiPage);
  } catch {
    return [];
  }
}

export async function getAllTagSlugs(): Promise<string[]> {
  // Tags are only known after pages are generated; return empty at build time
  // so Next.js renders them on demand (dynamic fallback).
  return [];
}

// ─── Locale-aware coloring page lookup (translation layer) ───────────────────

export interface LocalizedColoringPage {
  /** Canonical ColoringPage id */
  pageId: string;
  /** Canonical slug (used for canonical URL / pack) */
  canonicalSlug: string;
  /** Translated slug (used in the current locale URL) */
  slug: string;
  /** Effective locale that was resolved (may differ from requested if fallback applied) */
  locale: string;
  /** Whether the result is a DEFAULT_LOCALE fallback */
  isFallback: boolean;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  altText: string | null;
  description: string | null;
  imageUrl: string;
  thumbUrl: string | null;
  /** Canonical category slug */
  categorySlug: string;
  /** Translated tag names for this locale */
  tags: Array<{ name: string; slug: string }>;
  createdAt: Date;
  /** ColoringPage.status from the DB (e.g. "PUBLISHED" | "DRAFT") */
  status: string;
}

/**
 * Looks up a coloring page by locale + translated slug.
 *
 * Strategy:
 * 1. Find a ColoringPageTranslation where locale = requested locale AND slug = slug.
 * 2. If not found AND locale ≠ DEFAULT_LOCALE → try DEFAULT_LOCALE (fallback).
 * 3. If still not found → return null (caller should 404).
 *
 * @param locale  Requested locale (e.g. "de", "pl").
 * @param slug    Translated slug from the URL.
 */
export async function getColoringByLocaleAndSlug(
  locale: string,
  slug: string
): Promise<LocalizedColoringPage | null> {
  // ── 1. Try exact locale match ─────────────────────────────────────────────
  let translation = await (prisma as unknown as {
    coloringPageTranslation: {
      findFirst: (args: unknown) => Promise<unknown>;
    };
  }).coloringPageTranslation.findFirst({
    where: { locale, slug },
    include: {
      page: {
        include: {
          pageTags: {
            include: {
              translations: {
                where: { locale },
              },
            },
          },
        },
      },
    },
  }) as TranslationWithPage | null;

  let isFallback = false;

  // ── 2. Fallback to DEFAULT_LOCALE ─────────────────────────────────────────
  if (!translation && locale !== DEFAULT_LOCALE) {
    translation = await (prisma as unknown as {
      coloringPageTranslation: {
        findFirst: (args: unknown) => Promise<unknown>;
      };
    }).coloringPageTranslation.findFirst({
      where: { locale: DEFAULT_LOCALE, slug },
      include: {
        page: {
          include: {
            pageTags: {
              include: {
                translations: {
                  where: { locale: DEFAULT_LOCALE },
                },
              },
            },
          },
        },
      },
    }) as TranslationWithPage | null;

    if (translation) isFallback = true;
  }

  // ── 3. Not found ──────────────────────────────────────────────────────────
  if (!translation) return null;

  const page = translation.page;
  const effectiveLocale = isFallback ? DEFAULT_LOCALE : locale;

  // Map tag translations (fall back to canonical name/slug if no translation)
  const tags = page.pageTags.map((tag: PageTag) => {
    const tagTr = tag.translations?.[0];
    return {
      name: tagTr?.name ?? tag.name,
      slug: tagTr?.slug ?? tag.slug,
    };
  });

  return {
    pageId: page.id,
    canonicalSlug: page.slug,
    slug: translation.slug,
    locale: effectiveLocale,
    isFallback,
    title: translation.title,
    seoTitle: translation.seoTitle ?? null,
    seoDescription: translation.seoDescription ?? null,
    altText: translation.altText ?? null,
    description: translation.description ?? null,
    imageUrl: page.imageUrl,
    thumbUrl: page.thumbUrl ?? null,
    categorySlug: page.category,
    tags,
    createdAt: page.createdAt,
    status: page.status,
  };
}

// ─── Hreflang helper ─────────────────────────────────────────────────────────

export interface HreflangEntry {
  hreflang: string;
  url: string;
}

/**
 * Returns all available locale+slug pairs for a coloring page.
 * Used by buildColoringAlternates in lib/alternates.ts.
 *
 * @param pageId  Canonical ColoringPage.id
 */
export async function getColoringTranslations(
  pageId: string
): Promise<Array<{ locale: string; slug: string }>> {
  return (prisma as unknown as {
    coloringPageTranslation: {
      findMany: (args: unknown) => Promise<unknown>;
    };
  }).coloringPageTranslation.findMany({
    where: { pageId },
    select: { locale: true, slug: true },
  }) as Promise<Array<{ locale: string; slug: string }>>;
}

/**
 * Returns all available hreflang entries for a coloring page identified by
 * its canonical pageId.
 *
 * Fetches every ColoringPageTranslation for the page and maps them to
 * `{ hreflang, url }` pairs. Also adds an `x-default` entry pointing to the
 * DEFAULT_LOCALE translation.
 *
 * @param pageId   Canonical ColoringPage.id
 * @param baseUrl  Site origin, e.g. "https://example.com". Defaults to
 *                 NEXT_PUBLIC_SITE_URL env var or empty string (relative).
 */
export async function getColoringHreflang(
  pageId: string,
  baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? ''
): Promise<HreflangEntry[]> {
  const rows = await getColoringTranslations(pageId);

  if (rows.length === 0) return [];

  const entries: HreflangEntry[] = rows.map(({ locale, slug }) => ({
    hreflang: locale,
    url: `${baseUrl}/${locale}/coloring/${slug}`,
  }));

  // x-default → DEFAULT_LOCALE translation
  const defaultRow = rows.find((r) => r.locale === DEFAULT_LOCALE) ?? rows[0];
  entries.push({
    hreflang: 'x-default',
    url: `${baseUrl}/${defaultRow.locale}/coloring/${defaultRow.slug}`,
  });

  return entries;
}

// ─── Page tag IDs helper ──────────────────────────────────────────────────────

/**
 * Returns the canonical Tag.id values for all tags attached to a ColoringPage.
 * Used to seed getRelatedPages with the current page's tag IDs.
 */
export async function getPageTagIds(pageId: string): Promise<string[]> {
  const rows = await (prisma as unknown as {
    coloringPage: { findUnique: (args: unknown) => Promise<unknown> };
  }).coloringPage.findUnique({
    where: { id: pageId },
    select: { pageTags: { select: { id: true } } },
  }) as { pageTags: Array<{ id: string }> } | null;

  return rows?.pageTags.map((t) => t.id) ?? [];
}

// ─── Related pages ────────────────────────────────────────────────────────────

export interface RelatedPage {
  pageId: string;
  slug: string;        // translated slug for the locale
  title: string;
  description: string | null;
  imageUrl: string;
  thumbUrl: string | null;
}

/**
 * Returns related coloring pages for a given page in a given locale.
 *
 * Strategy:
 * 1. Pages sharing at least one tag with the current page (up to 8).
 * 2. Pages from the same category (to fill up to `limit`).
 * Both groups exclude the current page, require status=PUBLISHED,
 * and must have a translation in the requested locale.
 *
 * @param pageId    Canonical ColoringPage.id of the current page.
 * @param locale    Locale to resolve translations for.
 * @param category  Canonical category slug of the current page.
 * @param tagIds    Tag IDs of the current page (for shared-tag lookup).
 * @param limit     Maximum total results (default 8).
 */
export async function getRelatedPages({
  pageId,
  locale,
  category,
  tagIds,
  limit = 8,
}: {
  pageId: string;
  locale: string;
  category: string;
  tagIds: string[];
  limit?: number;
}): Promise<RelatedPage[]> {
  const db = prisma as unknown as {
    coloringPage: { findMany: (args: unknown) => Promise<unknown> };
    coloringPageTranslation: { findFirst: (args: unknown) => Promise<unknown> };
    pageLink: { findMany: (args: unknown) => Promise<unknown> };
  };

  // ── Try PageLink cache first ───────────────────────────────────────────────
  const cachedLinks = await db.pageLink.findMany({
    where: {
      fromPageId: pageId,
      locale,
      type: tagIds.length > 0 ? 'TAG_RELATED' : 'CATEGORY_RELATED',
    },
    select: { toPageId: true, weight: true },
    orderBy: { weight: 'desc' },
    take: limit,
  }) as Array<{ toPageId: string; weight: number }>;

  if (cachedLinks.length > 0) {
    // Resolve translations for cached page IDs
    const results: RelatedPage[] = [];
    for (const { toPageId } of cachedLinks) {
      if (results.length >= limit) break;
      const tr = await db.coloringPageTranslation.findFirst({
        where: { pageId: toPageId, locale },
        select: {
          slug: true,
          title: true,
          description: true,
          page: { select: { imageUrl: true, thumbUrl: true } },
        },
      }) as { slug: string; title: string; description: string | null; page: { imageUrl: string; thumbUrl: string | null } } | null;
      if (!tr) continue;
      results.push({
        pageId: toPageId,
        slug: tr.slug,
        title: tr.title,
        description: tr.description ?? null,
        imageUrl: tr.page.imageUrl,
        thumbUrl: tr.page.thumbUrl ?? null,
      });
    }
    if (results.length > 0) return results;
  }

  // ── Fallback: dynamic query ────────────────────────────────────────────────
  const seen = new Set<string>();
  const results: RelatedPage[] = [];

  // 1. Pages sharing tags (max 8)
  if (tagIds.length > 0) {
    const byTag = await db.coloringPage.findMany({
      where: {
        id: { not: pageId },
        status: 'PUBLISHED',
        pageTags: { some: { id: { in: tagIds } } },
        translations: { some: { locale } },
      },
      select: { id: true },
      take: 8,
    }) as Array<{ id: string }>;

    for (const { id } of byTag) {
      if (results.length >= limit) break;
      if (seen.has(id)) continue;
      seen.add(id);

      const tr = await db.coloringPageTranslation.findFirst({
        where: { pageId: id, locale },
        select: { slug: true, title: true, description: true, page: { select: { imageUrl: true, thumbUrl: true } } },
      }) as { slug: string; title: string; description: string | null; page: { imageUrl: string; thumbUrl: string | null } } | null;

      if (!tr) continue;
      results.push({
        pageId: id,
        slug: tr.slug,
        title: tr.title,
        description: tr.description ?? null,
        imageUrl: tr.page.imageUrl,
        thumbUrl: tr.page.thumbUrl ?? null,
      });
    }
  }

  // 2. Pages from same category (fill up to limit)
  if (results.length < limit) {
    const byCat = await db.coloringPage.findMany({
      where: {
        id: { not: pageId },
        status: 'PUBLISHED',
        category,
        translations: { some: { locale } },
      },
      select: { id: true },
      take: limit,
    }) as Array<{ id: string }>;

    for (const { id } of byCat) {
      if (results.length >= limit) break;
      if (seen.has(id)) continue;
      seen.add(id);

      const tr = await db.coloringPageTranslation.findFirst({
        where: { pageId: id, locale },
        select: { slug: true, title: true, description: true, page: { select: { imageUrl: true, thumbUrl: true } } },
      }) as { slug: string; title: string; description: string | null; page: { imageUrl: string; thumbUrl: string | null } } | null;

      if (!tr) continue;
      results.push({
        pageId: id,
        slug: tr.slug,
        title: tr.title,
        description: tr.description ?? null,
        imageUrl: tr.page.imageUrl,
        thumbUrl: tr.page.thumbUrl ?? null,
      });
    }
  }

  return results;
}

// ─── Related tags (co-occurring on same pages) ────────────────────────────────

export interface RelatedTagItem {
  tagId: string;
  slug: string;   // translated slug for the locale
  name: string;
}

/**
 * Returns tags that co-occur on the same pages as the given tag.
 * Useful for "Related tags" section on a tag hub page.
 *
 * @param tagId   Canonical Tag.id of the current tag.
 * @param locale  Locale to resolve tag translations for.
 * @param limit   Max number of related tags to return (default 10).
 */
export async function getRelatedTags(
  tagId: string,
  locale: string,
  limit = 10,
): Promise<RelatedTagItem[]> {
  const db = prisma as unknown as {
    tag: { findMany: (args: unknown) => Promise<unknown> };
    tagTranslation: { findFirst: (args: unknown) => Promise<unknown> };
  };

  // Find tags that share at least one page with the given tag
  const rows = await db.tag.findMany({
    where: {
      id: { not: tagId },
      pages: {
        some: {
          status: 'PUBLISHED',
          pageTags: { some: { id: tagId } },
        },
      },
    },
    select: { id: true },
    take: limit,
  }) as Array<{ id: string }>;

  const results: RelatedTagItem[] = [];
  for (const { id } of rows) {
    const tr = await db.tagTranslation.findFirst({
      where: { tagId: id, locale },
      select: { slug: true, name: true },
    }) as { slug: string; name: string } | null;
    if (!tr) continue;
    results.push({ tagId: id, slug: tr.slug, name: tr.name });
  }
  return results;
}

// ─── Popular tags in a category ───────────────────────────────────────────────

/**
 * Returns the most-used tags across published pages in a given category.
 * Useful for "Popular in this category" section on a category hub page.
 *
 * @param canonicalCategorySlug  Canonical category slug.
 * @param locale                 Locale to resolve tag translations for.
 * @param limit                  Max number of tags to return (default 10).
 */
export async function getPopularTagsInCategory(
  canonicalCategorySlug: string,
  locale: string,
  limit = 10,
): Promise<RelatedTagItem[]> {
  const db = prisma as unknown as {
    coloringPage: { findMany: (args: unknown) => Promise<unknown> };
    tagTranslation: { findFirst: (args: unknown) => Promise<unknown> };
  };

  // Fetch all pages in the category with their tags
  const pages = await db.coloringPage.findMany({
    where: { category: canonicalCategorySlug },
    select: { pageTags: { select: { id: true } } },
  }) as Array<{ pageTags: Array<{ id: string }> }>;

  // Count tag occurrences
  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const tag of page.pageTags) {
      counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
    }
  }

  // Sort by count descending, take top N
  const topTagIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const results: RelatedTagItem[] = [];
  for (const id of topTagIds) {
    const tr = await db.tagTranslation.findFirst({
      where: { tagId: id, locale },
      select: { slug: true, name: true },
    }) as { slug: string; name: string } | null;
    if (!tr) continue;
    results.push({ tagId: id, slug: tr.slug, name: tr.name });
  }
  return results;
}

// ─── Paginated coloring pages by tag ─────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Returns a paginated list of coloring pages for a tag (locale+slug).
 */
export async function getPaginatedColoringsByTag(
  locale: string,
  tagSlug: string,
  page = 1,
  pageSize = 24,
): Promise<PaginatedResult<LocalizedColoringPage>> {
  const tag = await getTagByLocaleAndSlug(locale, tagSlug);
  if (!tag) return { items: [], total: 0, page, pageSize, totalPages: 0 };

  const effectiveLocale = tag.isFallback ? DEFAULT_LOCALE : locale;

  const db = prisma as unknown as {
    coloringPage: {
      findMany: (args: unknown) => Promise<unknown>;
      findUnique: (args: unknown) => Promise<unknown>;
      count: (args: unknown) => Promise<number>;
    };
    coloringPageTranslation: { findFirst: (args: unknown) => Promise<unknown> };
  };

  const where = {
    published: true,
    pageTags: { some: { id: tag.tagId } },
  };

  const [total, pageRows] = await Promise.all([
    db.coloringPage.count({ where }),
    db.coloringPage.findMany({
      where,
      select: { id: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]) as [number, Array<{ id: string }>];

  const items: LocalizedColoringPage[] = [];
  for (const { id: pageId } of pageRows) {
    const tr = await db.coloringPageTranslation.findFirst({
      where: { pageId, locale: effectiveLocale },
      include: {
        page: {
          include: {
            pageTags: {
              include: { translations: { where: { locale: effectiveLocale } } },
            },
          },
        },
      },
    }) as TranslationWithPage | null;
    if (!tr) continue;

    const tags = tr.page.pageTags.map((t: PageTag) => {
      const tagTr = t.translations?.[0];
      return { name: tagTr?.name ?? t.name, slug: tagTr?.slug ?? t.slug };
    });

    items.push({
      pageId: tr.page.id,
      canonicalSlug: tr.page.slug,
      slug: tr.slug,
      locale: effectiveLocale,
      isFallback: tag.isFallback,
      title: tr.title,
      seoTitle: tr.seoTitle ?? null,
      seoDescription: tr.seoDescription ?? null,
      altText: tr.altText ?? null,
      description: tr.description ?? null,
      imageUrl: tr.page.imageUrl,
      thumbUrl: tr.page.thumbUrl ?? null,
      categorySlug: tr.page.category,
      tags,
      createdAt: tr.page.createdAt,
      status: tr.page.status,
    });
  }

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Returns a paginated list of coloring pages for a category (locale+slug).
 */
export async function getPaginatedColoringsByCategory(
  locale: string,
  categorySlug: string,
  page = 1,
  pageSize = 24,
): Promise<PaginatedResult<LocalizedColoringPage>> {
  const cat = await getCategoryByLocaleAndSlug(locale, categorySlug);
  if (!cat) return { items: [], total: 0, page, pageSize, totalPages: 0 };

  const effectiveLocale = cat.isFallback ? DEFAULT_LOCALE : locale;

  const db = prisma as unknown as {
    coloringPage: {
      findMany: (args: unknown) => Promise<unknown>;
      findUnique: (args: unknown) => Promise<unknown>;
      count: (args: unknown) => Promise<number>;
    };
    coloringPageTranslation: { findFirst: (args: unknown) => Promise<unknown> };
  };

  const where = { category: cat.canonicalSlug };

  const [total, pageRows] = await Promise.all([
    db.coloringPage.count({ where }),
    db.coloringPage.findMany({
      where,
      select: { id: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
  ]) as [number, Array<{ id: string }>];

  const items: LocalizedColoringPage[] = [];
  for (const { id: pageId } of pageRows) {
    const tr = await db.coloringPageTranslation.findFirst({
      where: { pageId, locale: effectiveLocale },
      include: {
        page: {
          include: {
            pageTags: {
              include: { translations: { where: { locale: effectiveLocale } } },
            },
          },
        },
      },
    }) as TranslationWithPage | null;

    if (tr) {
      // Has translation - use it
      const tags = tr.page.pageTags.map((t: PageTag) => {
        const tagTr = t.translations?.[0];
        return { name: tagTr?.name ?? t.name, slug: tagTr?.slug ?? t.slug };
      });

      items.push({
        pageId: tr.page.id,
        canonicalSlug: tr.page.slug,
        slug: tr.slug,
        locale: effectiveLocale,
        isFallback: cat.isFallback,
        title: tr.title,
        seoTitle: tr.seoTitle ?? null,
        seoDescription: tr.seoDescription ?? null,
        altText: tr.altText ?? null,
        description: tr.description ?? null,
        imageUrl: tr.page.imageUrl,
        thumbUrl: tr.page.thumbUrl ?? null,
        categorySlug: tr.page.category,
        tags,
        createdAt: tr.page.createdAt,
        status: tr.page.status,
      });
    } else {
      // No translation - fetch canonical page data directly
      const page = await db.coloringPage.findUnique({
        where: { id: pageId },
        include: { pageTags: true },
      }) as (CanonicalPage & { pageTags: PageTag[] }) | null;
      
      if (!page) continue;

      const tags = page.pageTags?.map((t: PageTag) => ({
        name: t.name,
        slug: t.slug,
      })) ?? [];

      items.push({
        pageId: page.id,
        canonicalSlug: page.slug,
        slug: page.slug, // Use canonical slug when no translation
        locale: effectiveLocale,
        isFallback: cat.isFallback,
        title: page.slug,
        seoTitle: null,
        seoDescription: null,
        altText: null,
        description: null,
        imageUrl: page.imageUrl,
        thumbUrl: page.thumbUrl ?? null,
        categorySlug: page.category,
        tags,
        createdAt: page.createdAt,
        status: page.status,
      });
    }
  }

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── Tag translation lookup ───────────────────────────────────────────────────

export interface LocalizedTag {
  tagId: string;
  canonicalSlug: string;
  slug: string;
  name: string;
  locale: string;
  isFallback: boolean;
}

/**
 * Looks up a Tag by locale + translated slug.
 * Falls back to DEFAULT_LOCALE if no translation found for the requested locale.
 * Returns null if not found at all.
 */
export async function getTagByLocaleAndSlug(
  locale: string,
  slug: string
): Promise<LocalizedTag | null> {
  type TagTrRow = { tagId: string; slug: string; name: string; locale: string; tag: { slug: string } };

  let row = await (prisma as unknown as {
    tagTranslation: { findFirst: (args: unknown) => Promise<unknown> };
  }).tagTranslation.findFirst({
    where: { locale, slug },
    select: { tagId: true, slug: true, name: true, locale: true, tag: { select: { slug: true } } },
  }) as TagTrRow | null;

  let isFallback = false;

  if (!row && locale !== DEFAULT_LOCALE) {
    row = await (prisma as unknown as {
      tagTranslation: { findFirst: (args: unknown) => Promise<unknown> };
    }).tagTranslation.findFirst({
      where: { locale: DEFAULT_LOCALE, slug },
      select: { tagId: true, slug: true, name: true, locale: true, tag: { select: { slug: true } } },
    }) as TagTrRow | null;
    if (row) isFallback = true;
  }

  if (!row) return null;

  return {
    tagId: row.tagId,
    canonicalSlug: row.tag.slug,
    slug: row.slug,
    name: row.name,
    locale: isFallback ? DEFAULT_LOCALE : locale,
    isFallback,
  };
}

/**
 * Returns all coloring pages that have a translation for the given tag locale+slug.
 * Each page is returned as a LocalizedColoringPage for the same locale.
 */
export async function getColoringsByTagLocaleAndSlug(
  locale: string,
  tagSlug: string
): Promise<LocalizedColoringPage[]> {
  const tag = await getTagByLocaleAndSlug(locale, tagSlug);
  if (!tag) return [];

  // Get all page IDs that have this tag
  const pageTagRows = await (prisma as unknown as {
    coloringPage: { findMany: (args: unknown) => Promise<unknown> };
  }).coloringPage.findMany({
    where: {
      published: true,
      pageTags: { some: { id: tag.tagId } },
    },
    select: { id: true },
  }) as Array<{ id: string }>;

  const effectiveLocale = tag.isFallback ? DEFAULT_LOCALE : locale;

  // For each page, fetch the translation for the effective locale
  const results: LocalizedColoringPage[] = [];
  for (const { id: pageId } of pageTagRows) {
    const tr = await (prisma as unknown as {
      coloringPageTranslation: { findFirst: (args: unknown) => Promise<unknown> };
    }).coloringPageTranslation.findFirst({
      where: { pageId, locale: effectiveLocale },
      include: {
        page: {
          include: {
            pageTags: {
              include: { translations: { where: { locale: effectiveLocale } } },
            },
          },
        },
      },
    }) as TranslationWithPage | null;

    if (!tr) continue;

    const tags = tr.page.pageTags.map((t: PageTag) => {
      const tagTr = t.translations?.[0];
      return { name: tagTr?.name ?? t.name, slug: tagTr?.slug ?? t.slug };
    });

    results.push({
      pageId: tr.page.id,
      canonicalSlug: tr.page.slug,
      slug: tr.slug,
      locale: effectiveLocale,
      isFallback: tag.isFallback,
      title: tr.title,
      seoTitle: tr.seoTitle ?? null,
      seoDescription: tr.seoDescription ?? null,
      altText: tr.altText ?? null,
      description: tr.description ?? null,
      imageUrl: tr.page.imageUrl,
      thumbUrl: tr.page.thumbUrl ?? null,
      categorySlug: tr.page.category,
      tags,
      createdAt: tr.page.createdAt,
      status: tr.page.status,
    });
  }

  return results;
}

// ─── Category translation lookup ──────────────────────────────────────────────

export interface LocalizedCategory {
  categoryId: string;
  canonicalSlug: string;
  slug: string;
  name: string;
  locale: string;
  isFallback: boolean;
}

/**
 * Looks up a Category by locale + translated slug.
 * Falls back to DEFAULT_LOCALE if no translation found.
 */
export async function getCategoryByLocaleAndSlug(
  locale: string,
  slug: string
): Promise<LocalizedCategory | null> {
  try {
    type CatTrRow = { categoryId: string; slug: string; name: string; locale: string; category: { slug: string } };

    let row = await (prisma as unknown as {
      categoryTranslation: { findFirst: (args: unknown) => Promise<unknown> };
    }).categoryTranslation.findFirst({
      where: { locale, slug },
      select: { categoryId: true, slug: true, name: true, locale: true, category: { select: { slug: true } } },
    }) as CatTrRow | null;

    let isFallback = false;

    if (!row && locale !== DEFAULT_LOCALE) {
      row = await (prisma as unknown as {
        categoryTranslation: { findFirst: (args: unknown) => Promise<unknown> };
      }).categoryTranslation.findFirst({
        where: { locale: DEFAULT_LOCALE, slug },
        select: { categoryId: true, slug: true, name: true, locale: true, category: { select: { slug: true } } },
      }) as CatTrRow | null;
      if (row) isFallback = true;
    }

    if (!row) return null;

    return {
      categoryId: row.categoryId,
      canonicalSlug: row.category.slug,
      slug: row.slug,
      name: row.name,
      locale: isFallback ? DEFAULT_LOCALE : locale,
      isFallback,
    };
  } catch (error) {
    console.error('[getCategoryByLocaleAndSlug] Error:', error);
    return null;
  }
}

/**
 * Looks up a CategoryTranslation by canonical category slug + locale.
 * Used on the coloring detail page to resolve the local category link.
 */
export async function getCategoryTranslationByCanonicalSlug(
  locale: string,
  canonicalSlug: string
): Promise<LocalizedCategory | null> {
  type CatTrRow = { categoryId: string; slug: string; name: string; locale: string; category: { slug: string } };

  let row = await (prisma as unknown as {
    categoryTranslation: { findFirst: (args: unknown) => Promise<unknown> };
  }).categoryTranslation.findFirst({
    where: { locale, category: { slug: canonicalSlug } },
    select: { categoryId: true, slug: true, name: true, locale: true, category: { select: { slug: true } } },
  }) as CatTrRow | null;

  let isFallback = false;

  if (!row && locale !== DEFAULT_LOCALE) {
    row = await (prisma as unknown as {
      categoryTranslation: { findFirst: (args: unknown) => Promise<unknown> };
    }).categoryTranslation.findFirst({
      where: { locale: DEFAULT_LOCALE, category: { slug: canonicalSlug } },
      select: { categoryId: true, slug: true, name: true, locale: true, category: { select: { slug: true } } },
    }) as CatTrRow | null;
    if (row) isFallback = true;
  }

  if (!row) return null;

  return {
    categoryId: row.categoryId,
    canonicalSlug: row.category.slug,
    slug: row.slug,
    name: row.name,
    locale: isFallback ? DEFAULT_LOCALE : locale,
    isFallback,
  };
}

/**
 * Returns all coloring pages for a category identified by locale + translated slug.
 */
export async function getColoringsByCategoryLocaleAndSlug(
  locale: string,
  categorySlug: string
): Promise<LocalizedColoringPage[]> {
  const cat = await getCategoryByLocaleAndSlug(locale, categorySlug);
  if (!cat) return [];

  const effectiveLocale = cat.isFallback ? DEFAULT_LOCALE : locale;

  const pageIds = await (prisma as unknown as {
    coloringPage: { findMany: (args: unknown) => Promise<unknown> };
  }).coloringPage.findMany({
    where: { category: cat.canonicalSlug },
    select: { id: true },
  }) as Array<{ id: string }>;

  const results: LocalizedColoringPage[] = [];
  for (const { id: pageId } of pageIds) {
    const tr = await (prisma as unknown as {
      coloringPageTranslation: { findFirst: (args: unknown) => Promise<unknown> };
    }).coloringPageTranslation.findFirst({
      where: { pageId, locale: effectiveLocale },
      include: {
        page: {
          include: {
            pageTags: {
              include: { translations: { where: { locale: effectiveLocale } } },
            },
          },
        },
      },
    }) as TranslationWithPage | null;

    if (!tr) continue;

    const tags = tr.page.pageTags.map((t: PageTag) => {
      const tagTr = t.translations?.[0];
      return { name: tagTr?.name ?? t.name, slug: tagTr?.slug ?? t.slug };
    });

    results.push({
      pageId: tr.page.id,
      canonicalSlug: tr.page.slug,
      slug: tr.slug,
      locale: effectiveLocale,
      isFallback: cat.isFallback,
      title: tr.title,
      seoTitle: tr.seoTitle ?? null,
      seoDescription: tr.seoDescription ?? null,
      altText: tr.altText ?? null,
      description: tr.description ?? null,
      imageUrl: tr.page.imageUrl,
      thumbUrl: tr.page.thumbUrl ?? null,
      categorySlug: tr.page.category,
      tags,
      createdAt: tr.page.createdAt,
      status: tr.page.status,
    });
  }

  return results;
}

// Internal types for the Prisma result shape (stale client workaround)
interface TagTranslationRow {
  name: string;
  slug: string;
}

interface PageTag {
  id: string;
  name: string;
  slug: string;
  translations?: TagTranslationRow[];
}

interface CanonicalPage {
  id: string;
  slug: string;
  category: string;
  imageUrl: string;
  thumbUrl: string | null;
  status: string;
  createdAt: Date;
  pageTags: PageTag[];
}

interface TranslationWithPage {
  slug: string;
  locale: string;
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  altText?: string | null;
  description?: string | null;
  page: CanonicalPage;
}
