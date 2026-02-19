import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { prisma } from '@coloring/db';
import { CategoryForm } from '../../CategoryForm';
import { updatePromptCategory } from '../../actions';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export const metadata = { title: 'Admin – Edytuj kategorię' };

export default async function EditPromptCategoryPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isValidLocale(locale)) notFound();

  const category = await prisma.promptCategory.findUnique({ where: { id } });
  if (!category) notFound();

  const action = updatePromptCategory.bind(null, id, locale);

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
          Edytuj: <span className="font-mono text-indigo-600">{category.slug}</span>
        </h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <CategoryForm
          action={action}
          defaultValues={{
            slug: category.slug,
            locale: category.locale,
            dailyQuota: category.dailyQuota,
            isActive: category.isActive,
            stylePreset: category.stylePreset ?? '',
            seedKeywords: category.seedKeywords,
            negativeKeywords: category.negativeKeywords,
          }}
          submitLabel="Zapisz zmiany"
        />
      </div>
    </div>
  );
}
