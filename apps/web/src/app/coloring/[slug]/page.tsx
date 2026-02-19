import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getColoringByLocaleAndSlug, getColoringTranslations, getCategoryTranslationByCanonicalSlug, getPageTagIds, getRelatedPages } from '@/lib/get-coloring';
import type { RelatedPage } from '@/lib/get-coloring';
import { isThinPage } from '@/lib/seoQuality';
import { buildColoringAlternates } from '@/lib/alternates';
import { AddToPackButton } from '@/components/AddToPackButton';
import { ColoringImage } from '@/components/ColoringImage';

// Static translations
const t = {
  'coloring.backToHome': '← Back to Home',
  'coloring.fallbackNotice': 'This page is not yet available in your language.',
  'coloring.addToPack': 'Add to Pack',
  'coloring.removeFromPack': 'Remove from Pack',
  'coloring.download': 'Download',
  'coloring.category': 'Category',
  'coloring.tags': 'Tags',
  'coloring.related.similar': 'Similar coloring pages',
  'coloring.related.category': 'More from this category',
};

interface ColoringDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: ColoringDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const coloring = await getColoringByLocaleAndSlug('en', slug);
  if (!coloring) return {};

  // Fetch all locale+slug pairs for this page and build canonical + hreflang map
  const translations = await getColoringTranslations(coloring.pageId);
  const { canonical, languages } = buildColoringAlternates(
    coloring.locale,
    coloring.slug,
    translations,
  );

  // Determine robots directive based on content quality
  const thin = isThinPage({
    status: coloring.status,
    description: coloring.description,
    seoTitle: coloring.seoTitle,
    seoDescription: coloring.seoDescription,
    tagCount: coloring.tags.length,
  });

  return {
    title: coloring.seoTitle ?? coloring.title,
    description: coloring.seoDescription ?? coloring.description ?? undefined,
    robots: thin
      ? { index: false, follow: true }
      : { index: true, follow: true },
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: coloring.seoTitle ?? coloring.title,
      description: coloring.seoDescription ?? coloring.description ?? undefined,
      images: [{ url: coloring.imageUrl, alt: coloring.altText ?? coloring.title }],
    },
  };
}

export default async function ColoringDetailPage({ params }: ColoringDetailPageProps) {
  const { slug } = await params;

  // Fetch via translation layer with fixed locale
  const coloring = await getColoringByLocaleAndSlug('en', slug);
  if (!coloring) notFound();

  // Resolve translated category for local link (lookup by canonical slug via DB)
  const localCategory = await getCategoryTranslationByCanonicalSlug('en', coloring.categorySlug)
    .catch(() => null);
  const categoryLocalSlug = localCategory?.slug ?? coloring.categorySlug;

  // Related pages
  const tagIds = await getPageTagIds(coloring.pageId);

  // "Similar" = tag-based (up to 4)
  const similarPages = await getRelatedPages({
    pageId: coloring.pageId,
    locale: 'en',
    category: coloring.categorySlug,
    tagIds,
    limit: 4,
  });

  // "More from category" = category-based only, excluding already-shown pages
  const shownIds = new Set(similarPages.map((p) => p.pageId));
  const categoryPages = await getRelatedPages({
    pageId: coloring.pageId,
    locale: 'en',
    category: coloring.categorySlug,
    tagIds: [], // no tag filter → pure category
    limit: 4 + shownIds.size, // over-fetch to account for deduplication
  }).then((pages) => pages.filter((p) => !shownIds.has(p.pageId)).slice(0, 4));

  return (
    <div className="flex flex-col gap-8">
      {/* Fallback notice */}
      {coloring.isFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {t['coloring.fallbackNotice']}
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t['coloring.backToHome']}
        </Link>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
          <ColoringImage
            src={coloring.imageUrl}
            alt={coloring.altText ?? coloring.title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-4"
            priority
            placeholderSize={80}
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
              {coloring.title}
            </h1>
            {coloring.description && (
              <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                {coloring.description}
              </p>
            )}
          </div>

          {/* Meta */}
          <dl className="flex flex-col gap-3 text-sm">
            {coloring.categorySlug && (
              <div className="flex items-center gap-2">
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">{t['coloring.category']}:</dt>
                <dd>
                  <Link
                    href={`/category/${categoryLocalSlug}`}
                    className="rounded-full bg-indigo-100 px-3 py-0.5 font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                  >
                    {localCategory?.name ?? coloring.categorySlug}
                  </Link>
                </dd>
              </div>
            )}

            {coloring.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">{t['coloring.tags']}:</dt>
                <dd className="flex flex-wrap gap-1">
                  {coloring.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      href={`/tag/${tag.slug}`}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <AddToPackButton
              coloring={{
                id: coloring.pageId,
                slug: coloring.canonicalSlug,
                title: { en: coloring.title },
                description: { en: coloring.description ?? '' },
                categoryId: coloring.categorySlug,
                categorySlug: coloring.categorySlug,
                imageUrl: coloring.imageUrl,
                thumbnailUrl: coloring.thumbUrl ?? coloring.imageUrl,
                tags: coloring.tags.map((t) => t.name),
                createdAt: coloring.createdAt.toISOString(),
              }}
            />
            <a
              href={coloring.imageUrl}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <DownloadIcon />
              {t['coloring.download']}
            </a>
          </div>
        </div>
      </div>

      {/* Similar coloring pages (shared tags) */}
      {similarPages.length > 0 && (
        <section aria-labelledby="similar-heading">
          <h2
            id="similar-heading"
            className="mb-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            {t['coloring.related.similar']}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similarPages.map((page) => (
              <RelatedCard key={page.pageId} page={page} />
            ))}
          </div>
        </section>
      )}

      {/* More from this category */}
      {categoryPages.length > 0 && (
        <section aria-labelledby="category-heading">
          <h2
            id="category-heading"
            className="mb-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            {t['coloring.related.category']}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categoryPages.map((page) => (
              <RelatedCard key={page.pageId} page={page} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RelatedCard({ page }: { page: RelatedPage }) {
  return (
    <Link
      href={`/coloring/${page.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <ColoringImage
          src={page.thumbUrl ?? page.imageUrl}
          alt={page.title}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          placeholderSize={40}
        />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
          {page.title}
        </p>
      </div>
    </Link>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
