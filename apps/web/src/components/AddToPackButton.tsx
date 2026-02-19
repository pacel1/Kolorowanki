'use client';

import { usePackContext } from '@/context/pack-context';
import type { ColoringPage } from '@/types';

// Static translations for English (no i18n)
const t = {
  'coloring.addToPack': 'Add to Pack',
  'coloring.inPack': 'In Pack',
};

interface AddToPackButtonProps {
  coloring: ColoringPage;
  className?: string;
}

export function AddToPackButton({ coloring, className = '' }: AddToPackButtonProps) {
  const { isInPack, toggleItem } = usePackContext();
  const locale = 'en';

  const inPack = isInPack(coloring.id);

  function handleClick() {
    toggleItem({
      coloringId: coloring.id,
      slug: coloring.slug,
      title: coloring.title[locale] || coloring.title['en'] || Object.values(coloring.title)[0],
      thumbnailUrl: coloring.thumbnailUrl,
    });
  }

  return (
    <button
      onClick={handleClick}
      aria-pressed={inPack}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        inPack
          ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-700 focus-visible:ring-green-500'
          : 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {inPack ? (
        <>
          <CheckIcon />
          <span>{t['coloring.inPack']}</span>
        </>
      ) : (
        <>
          <PlusIcon />
          <span>{t['coloring.addToPack']}</span>
        </>
      )}
    </button>
  );
}

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
