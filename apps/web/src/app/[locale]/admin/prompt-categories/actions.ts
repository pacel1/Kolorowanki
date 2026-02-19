'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@coloring/db';
import { SUPPORTED_LOCALES } from '@coloring/config/locales';
import type { PromptCategoryFormState } from './types';

// ─── Zod schema (not exported – stays server-side only) ───────────────────────

const PromptCategorySchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug musi mieć min. 2 znaki')
    .regex(/^[a-z0-9-]+$/, 'Slug może zawierać tylko małe litery, cyfry i myślniki'),
  locale: z.enum(SUPPORTED_LOCALES, { message: `Locale musi być jednym z: ${SUPPORTED_LOCALES.join(', ')}` }),
  dailyQuota: z.coerce.number().int().min(1).max(1000),
  isActive: z.coerce.boolean(),
  stylePreset: z.string().optional(),
  seedKeywords: z.string(),
  negativeKeywords: z.string(),
});

function parseKeywords(raw: string): string[] {
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPromptCategory(
  locale: string,
  _prev: PromptCategoryFormState,
  formData: FormData,
): Promise<PromptCategoryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = PromptCategorySchema.safeParse({
    ...raw,
    isActive: raw.isActive === 'on' || raw.isActive === 'true',
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as PromptCategoryFormState['errors'] };
  }

  const { seedKeywords, negativeKeywords, ...rest } = parsed.data;

  try {
    await prisma.promptCategory.create({
      data: {
        ...rest,
        seedKeywords: parseKeywords(seedKeywords),
        negativeKeywords: parseKeywords(negativeKeywords),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Unique constraint')) {
      return { errors: { slug: ['Slug już istnieje'] } };
    }
    return { message: `Błąd bazy danych: ${msg}` };
  }

  revalidatePath(`/${locale}/admin/prompt-categories`);
  redirect(`/${locale}/admin/prompt-categories`);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updatePromptCategory(
  id: string,
  locale: string,
  _prev: PromptCategoryFormState,
  formData: FormData,
): Promise<PromptCategoryFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = PromptCategorySchema.safeParse({
    ...raw,
    isActive: raw.isActive === 'on' || raw.isActive === 'true',
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as PromptCategoryFormState['errors'] };
  }

  const { seedKeywords, negativeKeywords, ...rest } = parsed.data;

  try {
    await prisma.promptCategory.update({
      where: { id },
      data: {
        ...rest,
        seedKeywords: parseKeywords(seedKeywords),
        negativeKeywords: parseKeywords(negativeKeywords),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { message: `Błąd bazy danych: ${msg}` };
  }

  revalidatePath(`/${locale}/admin/prompt-categories`);
  redirect(`/${locale}/admin/prompt-categories`);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deletePromptCategory(id: string, locale: string): Promise<void> {
  await prisma.promptCategory.delete({ where: { id } });
  revalidatePath(`/${locale}/admin/prompt-categories`);
}
