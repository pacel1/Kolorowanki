import { Worker, Job, Queue } from "bullmq";
import { prisma } from "@coloring/db";
import { translateColoringPage } from "@coloring/ai/translatePage.js";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@coloring/config/locales";
import type { SupportedLocale } from "@coloring/config/locales";
import { LINK_BOOST_QUEUE } from "./link-boost.js";

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Master switch – set TRANSLATION_ENABLED=false to skip all translation jobs.
 * Defaults to true so existing deployments are unaffected.
 */
export function isTranslationEnabled(): boolean {
  const val = process.env.TRANSLATION_ENABLED ?? "true";
  return val.toLowerCase() !== "false" && val !== "0";
}

/**
 * Maximum number of locales sent to the AI in a single call.
 * Defaults to 6 to stay within typical token / rate-limit budgets.
 */
export function getTranslationBatchSize(): number {
  const val = parseInt(process.env.TRANSLATION_BATCH_SIZE ?? "6", 10);
  return Number.isFinite(val) && val > 0 ? val : 6;
}

// ─── Queue name ───────────────────────────────────────────────────────────────

export const TRANSLATE_PAGE_QUEUE = "translate-page";

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface TranslatePagePayload {
  /** ColoringPage.id to translate */
  pageId: string;
  /**
   * Optional subset of locales to translate.
   * Defaults to all SUPPORTED_LOCALES.
   */
  locales?: SupportedLocale[];
}

// ─── Processor ────────────────────────────────────────────────────────────────

async function processTranslatePageJob(
  job: Job<TranslatePagePayload>,
  connection: { host: string; port: number }
): Promise<void> {
  // ── 0. Feature flag check ─────────────────────────────────────────────────
  if (!isTranslationEnabled()) {
    console.log(
      `[translate-page] TRANSLATION_ENABLED=false – skipping job id=${job.id} pageId=${job.data.pageId}`
    );
    return; // complete the job without doing anything
  }

  const { pageId, locales = [...SUPPORTED_LOCALES] } = job.data;

  console.log(
    `[translate-page] start id=${job.id} pageId=${pageId} locales=${locales.join(",")}`
  );

  // ── 1. Fetch canonical ColoringPage ───────────────────────────────────────
  const page = await prisma.coloringPage.findUnique({
    where: { id: pageId },
    include: {
      pageTags: {
        select: { id: true, slug: true, name: true },
      },
    },
  });

  if (!page) {
    throw new Error(`[translate-page] ColoringPage not found: ${pageId}`);
  }

  console.log(
    `[translate-page] found page slug="${page.slug}" tags=${page.pageTags.length}`
  );

  // ── 2. Resolve or create canonical Category record ────────────────────────
  let categoryRecord = await prisma.category.findFirst({
    where: { slug: page.category },
  });

  // page.locale may not be in the stale Prisma client type; cast via unknown
  const pageLocale: string =
    (page as unknown as Record<string, unknown>)["locale"] as string ?? "en";

  if (!categoryRecord) {
    categoryRecord = await prisma.category.create({
      data: {
        slug: page.category,
        name: page.category,
        locale: pageLocale,
      },
    });
    console.log(
      `[translate-page] created Category id=${categoryRecord.id} slug="${categoryRecord.slug}"`
    );
  }

  // ── 3. Build base data for translation ────────────────────────────────────
  const baseData = {
    title: page.title,
    description: page.description ?? page.title,
    category: page.category,
    tags: page.pageTags.map((t) => t.name),
    altText: page.title,
  };

  // ── 4. Translate in batches & persist (partial-success strategy) ──────────
  const batchSize = getTranslationBatchSize();

  // Split locales into chunks of batchSize
  const localeBatches: SupportedLocale[][] = [];
  for (let i = 0; i < locales.length; i += batchSize) {
    localeBatches.push(locales.slice(i, i + batchSize) as SupportedLocale[]);
  }

  console.log(
    `[translate-page] processing ${locales.length} locale(s) in ${localeBatches.length} batch(es) of max ${batchSize}`
  );

  const results: { locale: string; ok: boolean; error?: string }[] = [];

  for (let batchIdx = 0; batchIdx < localeBatches.length; batchIdx++) {
    const batchLocales = localeBatches[batchIdx];

    console.log(
      `[translate-page] batch ${batchIdx + 1}/${localeBatches.length} locales=${batchLocales.join(",")}`
    );

    let batch: Awaited<ReturnType<typeof translateColoringPage>>;
    try {
      batch = await translateColoringPage(baseData, batchLocales);
    } catch (err) {
      console.error(
        `[translate-page] translateColoringPage failed for batch ${batchIdx + 1}`,
        err
      );
      // Mark all locales in this batch as failed and continue to next batch
      for (const locale of batchLocales) {
        results.push({
          locale,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    // Persist each locale in this batch
    for (const locale of batchLocales) {
      const t = batch[locale];
      if (!t) {
        console.warn(
          `[translate-page] no translation returned for locale=${locale} – skipping`
        );
        results.push({ locale, ok: false, error: "missing in batch" });
        continue;
      }

      try {
        // ── 4a. ColoringPageTranslation ──────────────────────────────────
        await prisma.coloringPageTranslation.upsert({
          where: { pageId_locale: { pageId, locale } },
          create: {
            pageId,
            locale,
            title: t.title,
            slug: t.slug,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            altText: t.altText,
            description: t.description,
          },
          update: {
            title: t.title,
            slug: t.slug,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            altText: t.altText,
            description: t.description,
          },
        });

        // ── 4b. CategoryTranslation ──────────────────────────────────────
        await prisma.categoryTranslation.upsert({
          where: {
            categoryId_locale: {
              categoryId: categoryRecord.id,
              locale,
            },
          },
          create: {
            categoryId: categoryRecord.id,
            locale,
            name: t.category.name,
            slug: t.category.slug,
          },
          update: {
            name: t.category.name,
            slug: t.category.slug,
          },
        });

        // ── 4c. TagTranslation (for each tag on this page) ───────────────
        for (const pageTag of page.pageTags) {
          const translatedTag = t.tags.find(
            (tt) =>
              tt.slug === pageTag.slug ||
              tt.name.toLowerCase() === pageTag.name.toLowerCase()
          );

          if (!translatedTag) {
            console.warn(
              `[translate-page] no tag translation for tag="${pageTag.slug}" locale=${locale} – skipping tag`
            );
            continue;
          }

          await prisma.tagTranslation.upsert({
            where: {
              tagId_locale: {
                tagId: pageTag.id,
                locale,
              },
            },
            create: {
              tagId: pageTag.id,
              locale,
              name: translatedTag.name,
              slug: translatedTag.slug,
            },
            update: {
              name: translatedTag.name,
              slug: translatedTag.slug,
            },
          });
        }

        console.log(
          `[translate-page] saved locale=${locale} title="${t.title}"`
        );
        results.push({ locale, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[translate-page] failed to save locale=${locale}: ${msg}`
        );
        results.push({ locale, ok: false, error: msg });
        // Continue with remaining locales (partial success)
      }
    }
  } // end batch loop

  // ── 5. Publish page if DEFAULT_LOCALE translation was saved ──────────────
  const defaultLocaleOk = results.some(
    (r) => r.locale === DEFAULT_LOCALE && r.ok
  );

  if (defaultLocaleOk) {
    await (prisma.coloringPage.update as (args: unknown) => Promise<unknown>)({
      where: { id: pageId },
      data: { status: "PUBLISHED", published: true },
    });
    console.log(
      `[translate-page] ColoringPage id=${pageId} published (DEFAULT_LOCALE=${DEFAULT_LOCALE} translation saved)`
    );

    // ── Enqueue link-boost to pre-compute related page links ─────────────
    try {
      const linkBoostQueue = new Queue(LINK_BOOST_QUEUE, { connection });
      await linkBoostQueue.add(
        "link-boost",
        { pageId },
        {
          attempts: 2,
          backoff: { type: "exponential", delay: 10_000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 200 },
        }
      );
      await linkBoostQueue.close();
      console.log(`[translate-page] link-boost enqueued for pageId=${pageId}`);
    } catch (err) {
      // Non-fatal: link-boost is best-effort; page is already published
      console.warn(
        `[translate-page] failed to enqueue link-boost for pageId=${pageId}`,
        err
      );
    }
  } else {
    console.warn(
      `[translate-page] DEFAULT_LOCALE=${DEFAULT_LOCALE} translation missing or failed – page id=${pageId} remains DRAFT`
    );
  }

  // ── 6. Summary ────────────────────────────────────────────────────────────
  const saved = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(
    `[translate-page] done pageId=${pageId} saved=${saved} failed=${failed} published=${defaultLocaleOk}`
  );

  if (failed > 0) {
    const failedLocales = results
      .filter((r) => !r.ok)
      .map((r) => r.locale)
      .join(", ");
    console.warn(
      `[translate-page] partial failure – locales not saved: ${failedLocales}`
    );
  }

  // If ALL locales failed, throw so BullMQ can retry the job
  if (saved === 0) {
    throw new Error(
      `[translate-page] all ${locales.length} locale(s) failed to save`
    );
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createTranslatePageWorker(connection: {
  host: string;
  port: number;
}): Worker<TranslatePagePayload> {
  const worker = new Worker<TranslatePagePayload>(
    TRANSLATE_PAGE_QUEUE,
    async (job) => {
      try {
        await processTranslatePageJob(job, connection);
      } catch (err) {
        console.error(`[translate-page] job failed id=${job.id}`, err);
        throw err; // re-throw so BullMQ handles retry
      }
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(
      `[translate-page] completed id=${job.id} pageId=${job.data.pageId}`
    );
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[translate-page] failed id=${job?.id} attempt=${job?.attemptsMade} pageId=${job?.data.pageId}`,
      err.message
    );
  });

  console.log(
    `[translate-page] listening on queue "${TRANSLATE_PAGE_QUEUE}" …`
  );

  return worker;
}
