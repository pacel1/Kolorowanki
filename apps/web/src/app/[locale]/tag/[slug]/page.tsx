import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { getTranslator } from '@/i18n/translations';
import {
  getTagByLocaleAndSlug,
  getPaginatedColoringsByTag,
  getRelatedTags,
} from '@/lib/get-coloring';
import type { RelatedTagItem } from '@/lib/get-coloring';
import { ColoringImage } from '@/components/ColoringImage';

const PAGE_SIZE = 24;

interface TagPageProps {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) return {};

  const tag = await getTagByLocaleAndSlug(locale, slug);
  if (!tag) return {};

  const dict = getTranslator(locale);
  const seoDescFn = dict['tag.seoDescription'];
  const description =
    typeof seoDescFn === 'function' ? seoDescFn(tag.name) : `${tag.name} – coloring pages`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const canonical = `${siteUrl}/${tag.locale}/tag/${tag.slug}`;

  return {
    title: `${tag.name} – coloring pages`,
    description,
    alternates: { canonical },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { locale, slug } = await params;
  const { page: pageParam } = await searchParams;

  if (!isValidLocale(locale)) notFound();

  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const dict = getTranslator(locale);
  const t = (key: string) => {
    const v = dict[key];
    return typeof v === 'string' ? v : key;
  };
  const tf = (key: string, arg: string | number) => {
    const v = dict[key];
    return typeof v === 'function' ? v(arg) : key;
  };

  const [tag, result] = await Promise.all([
    getTagByLocaleAndSlug(locale, slug),
    getPaginatedColoringsByTag(locale, slug, currentPage, PAGE_SIZE),
  ]);

  if (!tag) notFound();

  const relatedTags = await getRelatedTags(tag.tagId, locale, 10);

  const seoDescFn = dict['tag.seoDescription'];
  const description =
    typeof seoDescFn === 'function' ? seoDescFn(tag.name) : '';

  const baseHref = `/${locale}/tag/${slug}`;

  return (
    <div className="flex flex-col gap-8">
      {/* Fallback notice */}
      {tag.isFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {t('coloring.fallbackNotice')}
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb">
        <Link
          href={`/${locale}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t('coloring.backToHome')}
        </Link>
      </nav>

      {/* Heading + SEO description */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
          {tag.name}
        </h1>
        {description && (
          <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">{description}</p>
        )}
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {result.total} {result.total === 1 ? t('pack.item') : t('pack.items')}
        </p>
      </div>

      {/* Grid */}
      {result.items.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">{t('tag.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {result.items.map((coloring) => (
            <Link
              key={coloring.pageId}
              href={`/${locale}/coloring/${coloring.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <ColoringImage
                  src={coloring.thumbUrl ?? coloring.imageUrl}
                  alt={coloring.altText ?? coloring.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  className="object-contain p-3 transition-transform group-hover:scale-105"
                  placeholderSize={40}
                />
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {coloring.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <nav aria-label="pagination" className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Link
              href={`${baseHref}?page=${currentPage - 1}`}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {t('pagination.prev')}
            </Link>
          )}
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {tf('pagination.page', currentPage)} / {result.totalPages}
          </span>
          {currentPage < result.totalPages && (
            <Link
              href={`${baseHref}?page=${currentPage + 1}`}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {t('pagination.next')}
            </Link>
          )}
        </nav>
      )}

      {/* Related tags */}
      {relatedTags.length > 0 && (
        <section aria-labelledby="related-tags-heading">
          <h2
            id="related-tags-heading"
            className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {t('tag.relatedTags')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedTags.map((tag) => (
              <TagChip key={tag.tagId} tag={tag} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TagChip({ tag, locale }: { tag: RelatedTagItem; locale: string }) {
  return (
    <Link
      href={`/${locale}/tag/${tag.slug}`}
      className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
    >
      {tag.name}
    </Link>
  );
}
