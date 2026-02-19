import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { prisma } from '@coloring/db';

// ─── Local types (mirrors Prisma schema, avoids TS cache issues) ──────────────
type CategorySlim = { id: string; slug: string };
type PromptRow = {
  id: string;
  topic: string;
  promptText: string;
  status: string;
  attempts: number;
  createdAt: Date;
  category: { slug: string };
};
import {
  retryGenerationPrompt,
  disableGenerationPrompt,
  generateNowPrompt,
} from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; categoryId?: string; page?: string }>;
}

export const metadata = { title: 'Admin – Generation Prompts' };

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PENDING:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DONE:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  FAILED:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  SKIPPED:    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const PAGE_SIZE = 50;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GenerationPromptsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const { status, categoryId, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  // Build filter
  const where = {
    ...(status ? { status: status as never } : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const [prompts, total, categories]: [PromptRow[], number, CategorySlim[]] = await Promise.all([
    db.generationPrompt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip,
      include: { category: { select: { slug: true } } },
    }),
    db.generationPrompt.count({ where }),
    db.promptCategory.findMany({
      orderBy: { slug: 'asc' },
      select: { id: true, slug: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build filter URL helper
  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { status, categoryId, page: '1', ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/${locale}/admin/generation-prompts?${p.toString()}`;
  }

  const STATUSES = ['PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Generation Prompts
          <span className="ml-2 text-sm font-normal text-zinc-400">({total})</span>
        </h1>
      </div>

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Status filter */}
        <div className="flex flex-wrap gap-1">
          <a
            href={filterUrl({ status: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${!status ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'}`}
          >
            Wszystkie
          </a>
          {STATUSES.map((s) => (
            <a
              key={s}
              href={filterUrl({ status: s })}
              className={`rounded-full px-3 py-1 text-xs font-medium ${status === s ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'}`}
            >
              {s}
            </a>
          ))}
        </div>

        {/* Category filter */}
        <select
          defaultValue={categoryId ?? ''}
          onChange={undefined}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          // Use form submit for filter
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.slug}</option>
          ))}
        </select>
      </div>

      {/* Category filter as links (no JS needed) */}
      <div className="mb-4 flex flex-wrap gap-1">
        <a
          href={filterUrl({ categoryId: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!categoryId ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'}`}
        >
          Wszystkie kategorie
        </a>
        {categories.map((c) => (
          <a
            key={c.id}
            href={filterUrl({ categoryId: c.id })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${categoryId === c.id ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'}`}
          >
            {c.slug}
          </a>
        ))}
      </div>

      {/* ── Table ── */}
      {prompts.length === 0 ? (
        <p className="text-zinc-500">Brak wyników.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Topic</th>
                <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300 max-w-xs">Prompt</th>
                <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Kategoria</th>
                <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Status</th>
                <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Próby</th>
                <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Utworzono</th>
                <th className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {prompts.map((p) => (
                <tr key={p.id} className="bg-white dark:bg-zinc-900">
                  <td className="px-3 py-3 font-medium text-zinc-800 dark:text-zinc-200 max-w-[180px]">
                    <span className="line-clamp-2">{p.topic}</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400 max-w-xs">
                    <span className="line-clamp-2 text-xs">{p.promptText}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {p.category.slug}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] ?? ''}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-zinc-600 dark:text-zinc-400">
                    {p.attempts}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {p.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {/* Retry */}
                      <form
                        action={async () => {
                          'use server';
                          await retryGenerationPrompt(p.id, locale);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300"
                        >
                          Retry
                        </button>
                      </form>

                      {/* Generate Now */}
                      <form
                        action={async () => {
                          'use server';
                          await generateNowPrompt(p.id, locale);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                        >
                          Generate
                        </button>
                      </form>

                      {/* Disable */}
                      {p.status !== 'SKIPPED' && (
                        <form
                          action={async () => {
                            'use server';
                            await disableGenerationPrompt(p.id, locale);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300"
                          >
                            Disable
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          {page > 1 && (
            <a
              href={filterUrl({ page: String(page - 1) })}
              className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              ← Poprzednia
            </a>
          )}
          <span className="text-sm text-zinc-500">
            Strona {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={filterUrl({ page: String(page + 1) })}
              className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Następna →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
