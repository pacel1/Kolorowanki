/**
 * link-boost queue
 *
 * Triggered after a page is published (enqueued by translate-page worker).
 * For each supported locale it computes the best 12 TAG_RELATED and 12
 * CATEGORY_RELATED pages for the newly-published page and upserts them into
 * the PageLink table.
 *
 * The detail page reads from PageLink first and falls back to a live query
 * only when no pre-computed links exist.
 */

import { Worker, Job } from "bullmq";
import { prisma } from "@coloring/db";
import { SUPPORTED_LOCALES } from "@coloring/config/locales";

// ─── Queue name ───────────────────────────────────────────────────────────────

export const LINK_BOOST_QUEUE = "link-boost";

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface LinkBoostPayload {
  /** Canonical ColoringPage.id of the page that was just published */
  pageId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_LIMIT = 12;
const CAT_LIMIT = 12;

// ─── Processor ────────────────────────────────────────────────────────────────

async function processLinkBoost(job: Job<LinkBoostPayload>): Promise<void> {
  const { pageId } = job.data;

  console.log(`[link-boost] start pageId=${pageId}`);

  // 1. Load the source page (need category + tag IDs)
  const page = await (prisma as unknown as {
    coloringPage: { findUnique: (args: unknown) => Promise<unknown> };
  }).coloringPage.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      category: true,
      status: true,
      pageTags: { select: { id: true } },
    },
  }) as {
    id: string;
    category: string;
    status: string;
    pageTags: Array<{ id: string }>;
  } | null;

  if (!page) {
    console.warn(`[link-boost] page not found id=${pageId} – skipping`);
    return;
  }

  if (page.status !== "PUBLISHED") {
    console.warn(
      `[link-boost] page id=${pageId} status=${page.status} – skipping (not PUBLISHED)`
    );
    return;
  }

  const tagIds = page.pageTags.map((t) => t.id);

  const db = prisma as unknown as {
    coloringPage: { findMany: (args: unknown) => Promise<unknown> };
    coloringPageTranslation: { findFirst: (args: unknown) => Promise<unknown> };
    pageLink: { upsert: (args: unknown) => Promise<unknown> };
  };

  // 2. For each locale, compute and upsert links
  for (const locale of SUPPORTED_LOCALES) {
    console.log(`[link-boost] processing locale=${locale} pageId=${pageId}`);

    // ── TAG_RELATED ──────────────────────────────────────────────────────────
    if (tagIds.length > 0) {
      const tagCandidates = await db.coloringPage.findMany({
        where: {
          id: { not: pageId },
          status: "PUBLISHED",
          pageTags: { some: { id: { in: tagIds } } },
          translations: { some: { locale } },
        },
        select: {
          id: true,
          pageTags: { select: { id: true } },
        },
        take: TAG_LIMIT * 3, // over-fetch to allow weight sorting
      }) as Array<{ id: string; pageTags: Array<{ id: string }> }>;

      // Weight = number of shared tags
      const tagWeighted = tagCandidates
        .map((c) => ({
          id: c.id,
          weight: c.pageTags.filter((t) => tagIds.includes(t.id)).length,
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, TAG_LIMIT);

      for (const { id: toPageId, weight } of tagWeighted) {
        await db.pageLink.upsert({
          where: {
            fromPageId_toPageId_type_locale: {
              fromPageId: pageId,
              toPageId,
              type: "TAG_RELATED",
              locale,
            },
          },
          update: { weight },
          create: {
            fromPageId: pageId,
            toPageId,
            type: "TAG_RELATED",
            locale,
            weight,
          },
        });
      }

      console.log(
        `[link-boost] upserted ${tagWeighted.length} TAG_RELATED links locale=${locale}`
      );
    }

    // ── CATEGORY_RELATED ─────────────────────────────────────────────────────
    const catCandidates = await db.coloringPage.findMany({
      where: {
        id: { not: pageId },
        status: "PUBLISHED",
        category: page.category,
        translations: { some: { locale } },
      },
      select: { id: true },
      take: CAT_LIMIT,
      orderBy: { createdAt: "desc" },
    }) as Array<{ id: string }>;

    for (const { id: toPageId } of catCandidates) {
      await db.pageLink.upsert({
        where: {
          fromPageId_toPageId_type_locale: {
            fromPageId: pageId,
            toPageId,
            type: "CATEGORY_RELATED",
            locale,
          },
        },
        update: { weight: 1 },
        create: {
          fromPageId: pageId,
          toPageId,
          type: "CATEGORY_RELATED",
          locale,
          weight: 1,
        },
      });
    }

    console.log(
      `[link-boost] upserted ${catCandidates.length} CATEGORY_RELATED links locale=${locale}`
    );
  }

  console.log(`[link-boost] done pageId=${pageId}`);
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createLinkBoostWorker(connection: {
  host: string;
  port: number;
}): Worker<LinkBoostPayload> {
  const worker = new Worker<LinkBoostPayload>(
    LINK_BOOST_QUEUE,
    async (job) => {
      await processLinkBoost(job);
    },
    {
      connection,
      concurrency: 1, // link computation is DB-heavy; run serially
    }
  );

  worker.on("completed", (job) => {
    console.log(`[link-boost] completed id=${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[link-boost] failed id=${job?.id} attempt=${job?.attemptsMade}`,
      err.message
    );
  });

  console.log(`[link-boost] listening on queue "${LINK_BOOST_QUEUE}"`);

  return worker;
}
