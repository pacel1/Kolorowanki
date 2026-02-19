import Link from 'next/link';
import type { ColoringPage, Locale } from '@/types';
import { AddToPackButton } from './AddToPackButton';
import { ColoringImage } from './ColoringImage';

interface ColoringCardProps {
  coloring: ColoringPage;
  locale: Locale;
}

export function ColoringCard({ coloring, locale }: ColoringCardProps) {
const title = coloring.title[locale];
const altText = title || 'Coloring page image';
  const description = coloring.description[locale];
  const href = `/${locale}/coloring/${coloring.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
<ColoringImage
          src={coloring.thumbnailUrl}
          alt={altText}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          placeholderSize={48}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <Link href={href}>
            <h3 className="text-base font-semibold leading-snug text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400">
              {title}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>

        {coloring.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {coloring.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <AddToPackButton coloring={coloring} locale={locale} className="w-full justify-center" />
      </div>
    </article>
  );
}

