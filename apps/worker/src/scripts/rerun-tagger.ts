import "dotenv/config";
import { Queue } from "bullmq";
import { prisma } from "@coloring/db";
import { generateSeoMetadata } from "@coloring/ai/tagger.js";
import { TRANSLATE_PAGE_QUEUE } from "../queues/translate-page.js";
import type { SupportedLocale } from "@coloring/config/locales";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
};

function tagToSlug(tag: string): string {
  const diacritics: Record<string, string> = {
    ą: "a", ć: "c", ę: "e", ł: "l", ń: "n",
    ó: "o", ś: "s", ź: "z", ż: "z",
    Ą: "a", Ć: "c", Ę: "e", Ł: "l", Ń: "n",
    Ó: "o", Ś: "s", Ź: "z", Ż: "z",
  };

  return tag
    .split("")
    .map((ch) => diacritics[ch] ?? ch)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Find pages without tags or with no pageTags relation
const pagesWithoutTags = await prisma.coloringPage.findMany({
  where: {
    pageTags: {
      none: {},
    },
  },
  select: {
    id: true,
    slug: true,
    title: true,
    category: true,
    locale: true,
  },
});

console.log(`[rerun-tagger] Found ${pagesWithoutTags.length} pages without tags`);

if (pagesWithoutTags.length === 0) {
  console.log("[rerun-tagger] No pages need tagging");
  await prisma.$disconnect();
  process.exit(0);
}

let successCount = 0;
let failedCount = 0;

for (const page of pagesWithoutTags) {
  try {
    console.log(`[rerun-tagger] Processing page id=${page.id} title="${page.title}"`);
    
    const seo = await generateSeoMetadata(
      page.title,
      page.locale as SupportedLocale
    );
    
    console.log(`[rerun-tagger] Generated tags: ${seo.tags.join(", ")}`);
    
    // Use fallback locale if page.locale is null
    const tagLocale = page.locale ?? "en";
    
    // Create or update tags
    const tagIds: string[] = [];
    for (const tagName of seo.tags) {
      const tagSlug = tagToSlug(tagName);
      const tag = await prisma.tag.upsert({
        where: { slug: tagSlug },
        update: {},
        create: { slug: tagSlug, name: tagName, locale: tagLocale },
      });
      tagIds.push(tag.id);
    }
    
    // Update page with tags and SEO
    await prisma.coloringPage.update({
      where: { id: page.id },
      data: {
        title: seo.title,
        description: seo.description,
        pageTags: { connect: tagIds.map((id) => ({ id })) },
      },
    });
    
    console.log(`[rerun-tagger] Page id=${page.id} tagged with ${tagIds.length} tags`);
    successCount++;
    
    // Enqueue translate-page job
    const translateQueue = new Queue(TRANSLATE_PAGE_QUEUE, { connection });
    await translateQueue.add(
      "translate",
      { pageId: page.id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 15_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      }
    );
    await translateQueue.close();
    
    console.log(`[rerun-tagger] Enqueued translate-page for page id=${page.id}`);
    
  } catch (err) {
    console.error(`[rerun-tagger] Failed for page id=${page.id}:`, err);
    failedCount++;
  }
}

console.log(`[rerun-tagger] Done: ${successCount} success, ${failedCount} failed`);
await prisma.$disconnect();
