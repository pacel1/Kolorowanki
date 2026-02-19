import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { isValidLocale, locales } from '@/i18n/config';
import { getTranslations } from '@/i18n/translations';
import { PackProvider } from '@/context/pack-context';
import { PackSidebar } from '@/components/PackSidebar';
import type { Locale } from '@/types';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};

  const t = getTranslations(locale);

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: {
      default: t('site.name'),
      template: `%s | ${t('site.name')}`,
    },
    description: t('site.tagline'),
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const t = getTranslations(locale as Locale);
  const typedLocale = locale as Locale;

  return (
    <div lang={locale} className="min-h-screen bg-zinc-50 font-sans antialiased dark:bg-zinc-950">
      <PackProvider>
        {/* Navigation */}
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href={`/${locale}`}
              className="text-lg font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {t('site.name')}
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}`}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t('nav.home')}
              </Link>
              <Link
                href={`/${locale}/pack`}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t('nav.pack')}
              </Link>

              {/* Locale switcher */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
                {locales.map((l) => (
                  <LocaleSwitcherLink key={l} locale={l} currentLocale={typedLocale} />
                ))}
              </div>
            </div>
          </nav>
        </header>

        {/* Main layout with optional sidebar */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <main className="min-w-0 flex-1">{children}</main>
            <div className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-24">
                <PackSidebar locale={typedLocale} />
              </div>
            </div>
          </div>
        </div>
      </PackProvider>
    </div>
  );
}

function LocaleSwitcherLink({
  locale,
  currentLocale,
}: {
  locale: Locale;
  currentLocale: Locale;
}) {
  const isActive = locale === currentLocale;
  return (
    <Link
      href={`/${locale}`}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'rounded px-2 py-0.5 text-xs font-semibold uppercase transition-colors',
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
      ].join(' ')}
    >
      {locale}
    </Link>
  );
}
