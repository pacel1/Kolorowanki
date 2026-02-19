import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { getTranslations } from '@/i18n/translations';
import { getColoringPages } from '@/lib/get-coloring';
import { ColoringCard } from '@/components/ColoringCard';
import type { Locale } from '@/types';

interface ColoringListPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: ColoringListPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { category } = await searchParams;
  if (!isValidLocale(locale)) return {};
  const t = getTranslations(locale);
  const title = category
    ? `${category} – ${t('home.title')}`
    : t('home.title');
  return { title };
}

export default async function ColoringListPage({
  params,
  searchParams,
}: ColoringListPageProps) {
  const { locale } = await params;
  const { category } = await searchParams;

  if (!isValidLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const t = getTranslations(typedLocale);

  const pages = await getColoringPages(category);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {category ? category : t('home.featured.heading')}
        </h1>
        {pages.length === 0 ? (
          <p className="mt-6 text-zinc-500 dark:text-zinc-400">
            Brak kolorowanek w tej kategorii.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((coloring) => (
              <ColoringCard
                key={coloring.id}
                coloring={coloring}
                locale={typedLocale}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
