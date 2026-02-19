import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { getTranslations } from '@/i18n/translations';
import { getCategories, getFeaturedColorings } from '@/lib/get-coloring';
import { ColoringCard } from '@/components/ColoringCard';
import type { Locale } from '@/types';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};

  const t = getTranslations(locale);

  return {
    title: t('home.title'),
    description: t('home.description'),
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const t = getTranslations(typedLocale);

  const [categories, featured] = await Promise.all([
    getCategories(locale),
    getFeaturedColorings(6),
  ]);

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 px-8 py-12 dark:from-indigo-950/30 dark:to-purple-950/30">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          {t('home.title')}
        </h1>
        <p className="mt-3 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          {t('home.description')}
        </p>
      </section>

      {/* Categories */}
      <section>
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('home.categories.heading')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/${locale}/category/${category.slug}`}
              className="group flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  <CategoryIcon />
                </div>
                <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                  {category.name[typedLocale]}
                </h3>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {category.description[typedLocale]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured colorings */}
      <section>
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('home.featured.heading')}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((coloring) => (
            <ColoringCard key={coloring.id} coloring={coloring} locale={typedLocale} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CategoryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
