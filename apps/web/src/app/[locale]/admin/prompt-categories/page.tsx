import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { prisma } from '@coloring/db';
import { deletePromptCategory } from './actions';

interface Props {
  params: Promise<{ locale: string }>;
}

export const metadata = { title: 'Admin – Prompt Categories' };

export default async function PromptCategoriesPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const categories = await prisma.promptCategory.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { prompts: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Prompt Categories
        </h1>
        <Link
          href={`/${locale}/admin/prompt-categories/new`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Dodaj kategorię
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-zinc-500">Brak kategorii. Dodaj pierwszą!</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Slug</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Locale</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Quota</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Aktywna</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Prompty</th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {categories.map((cat) => (
                <tr key={cat.id} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-200">{cat.slug}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{cat.locale}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{cat.dailyQuota}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {cat.isActive ? 'tak' : 'nie'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{cat._count.prompts}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/${locale}/admin/prompt-categories/${cat.id}/edit`}
                        className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300"
                      >
                        Edytuj
                      </Link>
                      <form
                        action={async () => {
                          'use server';
                          await deletePromptCategory(cat.id, locale);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        >
                          Usuń
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
