import type { Metadata } from 'next';
import Link from 'next/link';
import { PackProvider } from '@/context/pack-context';
import { PackSidebar } from '@/components/PackSidebar';

// Static translations for English (no i18n)
const t = {
  'site.name': 'Coloring Pages',
  'nav.home': 'Home',
  'nav.pack': 'My Pack',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: t['site.name'],
    template: `%s | ${t['site.name']}`,
  },
  description: 'Free printable coloring pages for kids',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="min-h-screen bg-zinc-50 font-sans antialiased dark:bg-zinc-950">
      <PackProvider>
        {/* Navigation */}
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="text-lg font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {t['site.name']}
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t['nav.home']}
              </Link>
              <Link
                href="/pack"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t['nav.pack']}
              </Link>
            </div>
          </nav>
        </header>

        {/* Main layout with optional sidebar */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <main className="min-w-0 flex-1">{children}</main>
            <div className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-24">
                <PackSidebar />
              </div>
            </div>
          </div>
        </div>
      </PackProvider>
    </div>
  );
}
