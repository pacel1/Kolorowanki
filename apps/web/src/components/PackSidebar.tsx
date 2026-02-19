'use client';

import Link from 'next/link';
import { usePackContext } from '@/context/pack-context';
import { ColoringImage } from './ColoringImage';

// Static translations for English (no i18n)
const t = {
  'sidebar.title': 'Pack',
  'sidebar.viewPack': 'View Pack',
  'sidebar.empty': 'Pack is empty',
  'pack.remove': 'Remove',
};

export function PackSidebar() {
  const { pack, removeItem, count } = usePackContext();
  const locale = 'en';

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {t['sidebar.title']}
          {count > 0 && (
            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {count}
            </span>
          )}
        </h2>
        {count > 0 && (
          <Link
            href="/pack"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {t['sidebar.viewPack']}
          </Link>
        )}
      </div>

      {/* Items */}
      {count === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t['sidebar.empty']}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pack.items.map((item) => (
            <li
              key={item.coloringId}
              className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-800/50"
            >
              {/* Thumbnail */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-700">
                <ColoringImage
                  src={item.thumbnailUrl}
                  alt={item.title}
                  fill
                  sizes="40px"
                  className="object-cover"
                  placeholderSize={16}
                />
              </div>

              {/* Title */}
              <Link
                href={`/coloring/${item.slug}`}
                className="flex-1 truncate text-sm font-medium text-zinc-800 hover:text-indigo-600 dark:text-zinc-200 dark:hover:text-indigo-400"
              >
                {item.title}
              </Link>

              {/* Remove button */}
              <button
                onClick={() => removeItem(item.coloringId)}
                aria-label={`${t['pack.remove']} ${item.title}`}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <XIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* View pack CTA */}
      {count > 0 && (
        <Link
          href="/pack"
          className="block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {t['sidebar.viewPack']} ({count})
        </Link>
      )}
    </aside>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
