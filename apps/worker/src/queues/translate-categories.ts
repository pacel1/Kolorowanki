import { Worker, Job } from "bullmq";
import { prisma } from "@coloring/db";
import { translateCategory, keyToEnglishName } from "@coloring/ai/translateCategory.js";
import { SUPPORTED_LOCALES } from "@coloring/config/locales";
import type { SupportedLocale } from "@coloring/config/locales";

// ─── Queue name ───────────────────────────────────────────────────────────────

export const TRANSLATE_CATEGORIES_QUEUE = "translate-categories";

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface TranslateCategoriesPayload {
  /**
   * Optional: translate only this specific Category.id.
   * If omitted, all categories without full translations are processed.
   */
  categoryId?: string;
  /**
   * Optional subset of locales to translate.
   * Defaults to all SUPPORTED_LOCALES.
   */
  locales?: SupportedLocale[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns Category records that are missing at least one translation
 * for the requested locales.
 */
async function fetchUntranslatedCategories(
  locales: SupportedLocale[],
  categoryId?: string
) {
  const where = categoryId ? { id: categoryId } : {};

  const categories = await prisma.category.findMany({
    where,
    include: {
      translations: { select: { locale: true } },
    },
  });

  // Keep only categories that are missing at least one locale
  return categories.filter((cat) => {
    const existingLocales = new Set(cat.translations.map((t) => t.locale));
    return locales.some((l) => !existingLocales.has(l));
  });
}

// ─── Processor ────────────────────────────────────────────────────────────────

async function processTranslateCategoriesJob(
  job: Job<TranslateCategoriesPayload>
): Promise<void> {
  const { categoryId, locales = [...SUPPORTED_LOCALES] } = job.data;

  console.log(
    `[translate-categories] start id=${job.id} categoryId=${categoryId ?? "all"} locales=${locales.join(",")}`
  );

  // ── 1. Find categories that need translation ───────────────────────────────
  const categories = await fetchUntranslatedCategories(locales, categoryId);

  if (categories.length === 0) {
    console.log(
      `[translate-categories] nothing to do – all categories already translated for requested locales`
    );
    return;
  }

  console.log(
    `[translate-categories] ${categories.length} category/categories to translate`
  );

  // ── 2. Process each category ──────────────────────────────────────────────
  for (const cat of categories) {
    const existingLocales = new Set(cat.translations.map((t) => t.locale));
    const missingLocales = locales.filter(
      (l) => !existingLocales.has(l)
    ) as SupportedLocale[];

    if (missingLocales.length === 0) continue;

    const englishName = keyToEnglishName(cat.slug);

    console.log(
      `[translate-categories] translating "${cat.slug}" (${englishName}) for ${missingLocales.length} locale(s): ${missingLocales.join(",")}`
    );

    // ── 2a. Call AI translator ─────────────────────────────────────────────
    let batch: Awaited<ReturnType<typeof translateCategory>>;
    try {
      batch = await translateCategory(cat.slug, englishName, missingLocales);
    } catch (err) {
      console.error(
        `[translate-categories] translateCategory failed for "${cat.slug}"`,
        err
      );
      // Non-fatal: skip this category and continue with the rest
      continue;
    }

    // ── 2b. Persist CategoryTranslation for each locale ────────────────────
    for (const locale of missingLocales) {
      const t = batch[locale];
      if (!t) {
        console.warn(
          `[translate-categories] no translation returned for locale=${locale} category="${cat.slug}" – skipping`
        );
        continue;
      }

      try {
        await prisma.categoryTranslation.upsert({
          where: {
            categoryId_locale: { categoryId: cat.id, locale },
          },
          create: {
            categoryId: cat.id,
            locale,
            name: t.name,
            slug: t.slug,
          },
          update: {
            name: t.name,
            slug: t.slug,
          },
        });

        console.log(
          `[translate-categories] saved locale=${locale} category="${cat.slug}" → name="${t.name}" slug="${t.slug}"`
        );
      } catch (err) {
        console.error(
          `[translate-categories] failed to save locale=${locale} category="${cat.slug}"`,
          err
        );
        // Continue with remaining locales (partial success)
      }
    }
  }

  console.log(`[translate-categories] done id=${job.id}`);
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createTranslateCategoriesWorker(connection: {
  host: string;
  port: number;
}): Worker<TranslateCategoriesPayload> {
  const worker = new Worker<TranslateCategoriesPayload>(
    TRANSLATE_CATEGORIES_QUEUE,
    async (job) => {
      try {
        await processTranslateCategoriesJob(job);
      } catch (err) {
        console.error(`[translate-categories] job failed id=${job.id}`, err);
        throw err;
      }
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(
      `[translate-categories] completed id=${job.id} categoryId=${job.data.categoryId ?? "all"}`
    );
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[translate-categories] failed id=${job?.id} attempt=${job?.attemptsMade}`,
      err.message
    );
  });

  console.log(
    `[translate-categories] listening on queue "${TRANSLATE_CATEGORIES_QUEUE}" …`
  );

  return worker;
}
