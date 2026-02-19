import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { CategoryForm } from '../CategoryForm';
import { createPromptCategory } from '../actions';

interface Props {
  params: Promise<{ locale: string }>;
}

export const metadata = { title: 'Admin – Nowa kategoria' };

export default async function NewPromptCategoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const action = createPromptCategory.bind(null, locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/${locale}/admin/prompt-categories`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Wróć
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Nowa kategoria
        </h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <CategoryForm action={action} submitLabel="Utwórz kategorię" />
      </div>
    </div>
  );
}
