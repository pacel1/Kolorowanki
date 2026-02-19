'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePackContext } from '@/context/pack-context';

// Static translations
const t = {
  'pack.title': 'My Pack',
  'pack.description': 'Your selected coloring pages for download.',
  'pack.empty': 'Your pack is empty.',
  'pack.empty.cta': 'Browse coloring pages',
  'pack.download': 'Download Pack',
  'pack.clear': 'Clear Pack',
  'pack.items': 'coloring pages',
  'pack.item': 'coloring page',
  'pack.remove': 'Remove',
};

type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

interface PackJob {
  id: string;
  status: JobStatus;
  pages: string[];
  resultUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type GenerateState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'polling'; job: PackJob }
  | { phase: 'done'; job: PackJob }
  | { phase: 'error'; message: string };

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES: JobStatus[] = ['DONE', 'FAILED'];

export default function PackPage() {
  const { pack, removeItem, clearPack, count } = usePackContext();
  const [state, setState] = useState<GenerateState>({ phase: 'idle' });
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Poll job status
  const pollJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/pack/${jobId}`);
      if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
      const data = await res.json() as { job: PackJob };
      const job = data.job;

      if (TERMINAL_STATUSES.includes(job.status)) {
        setState(
          job.status === 'DONE'
            ? { phase: 'done', job }
            : { phase: 'error', message: 'Generation failed. Please try again.' },
        );
      } else {
        setState({ phase: 'polling', job });
        pollTimerRef.current = setTimeout(() => pollJob(jobId), POLL_INTERVAL_MS);
      }
    } catch {
      setState({ phase: 'error', message: 'Connection error while checking status.' });
    }
  }, []);

  // Generate PDF
  const handleGenerate = useCallback(async () => {
    if (count === 0) return;
    setState({ phase: 'submitting' });

    try {
      const slugs = pack.items.map((item) => item.slug);
      const res = await fetch('/api/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: slugs }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { job: PackJob };
      setState({ phase: 'polling', job: data.job });
      pollTimerRef.current = setTimeout(() => pollJob(data.job.id), POLL_INTERVAL_MS);
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [count, pack.items, pollJob]);

  const handleReset = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setState({ phase: 'idle' });
  }, []);

  // Derived
  const isGenerating = state.phase === 'submitting' || state.phase === 'polling';
  const currentJob = state.phase === 'polling' || state.phase === 'done' ? state.job : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {t['pack.title']}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t['pack.description']}</p>
        </div>

        {count > 0 && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={clearPack}
              disabled={isGenerating}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {t['pack.clear']}
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {count === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <EmptyPackIcon />
          <div>
            <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">{t['pack.empty']}</p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            {t['pack.empty.cta']}
          </Link>
        </div>
      ) : (
        <>
          {/* Count */}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {count} {count === 1 ? t['pack.item'] : t['pack.items']}
          </p>

          {/* Items grid */}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pack.items.map((item) => (
              <li
                key={item.coloringId}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <Link
                  href={`/coloring/${item.slug}`}
                  className="relative block aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                >
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-300 dark:text-zinc-600"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                </Link>

                <div className="flex items-center justify-between gap-2 p-3">
                  <Link
                    href={`/coloring/${item.slug}`}
                    className="flex-1 truncate text-sm font-medium text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
                  >
                    {item.title}
                  </Link>
                  <button
                    onClick={() => removeItem(item.coloringId)}
                    disabled={isGenerating}
                    aria-label={`${t['pack.remove']} ${item.title}`}
                    className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <XIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Generate PDF section */}
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Generate PDF
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  Create a PDF pack with all coloring pages in your cart.
                </p>
              </div>

              {/* Main action button */}
              {state.phase === 'idle' && (
                <button
                  onClick={handleGenerate}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  <PdfIcon />
                  Generate PDF ({count})
                </button>
              )}

              {isGenerating && (
                <button
                  disabled
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-400 px-5 py-2.5 text-sm font-medium text-white"
                >
                  <SpinnerIcon />
                  {state.phase === 'submitting' ? 'Creating task...' : 'Generating...'}
                </button>
              )}

              {state.phase === 'done' && state.job.resultUrl && (
                <a
                  href={state.job.resultUrl}
                  download
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  <DownloadIcon />
                  Download PDF
                </a>
              )}

              {(state.phase === 'error' || state.phase === 'done') && (
                <button
                  onClick={handleReset}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Status indicator */}
            {state.phase !== 'idle' && (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
                {isGenerating && (
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                )}
                {state.phase === 'done' && (
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                )}
                {state.phase === 'error' && (
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                )}

                <div className="flex-1 text-sm">
                  {state.phase === 'submitting' && (
                    <span className="text-zinc-600 dark:text-zinc-400">Creating task...</span>
                  )}
                  {state.phase === 'polling' && (
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Status:{' '}
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {state.job.status}
                      </span>
                      {' '}· ID: <code className="text-xs">{state.job.id}</code>
                    </span>
                  )}
                  {state.phase === 'done' && (
                    <span className="font-medium text-green-700 dark:text-green-400">
                      ✓ PDF ready!
                    </span>
                  )}
                  {state.phase === 'error' && (
                    <span className="text-red-600 dark:text-red-400">{state.message}</span>
                  )}
                </div>

                {currentJob && (
                  <span className="shrink-0 text-xs text-zinc-400">
                    Job #{currentJob.id.slice(0, 8)}
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Icons
function PdfIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="animate-spin" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function EmptyPackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
      className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
