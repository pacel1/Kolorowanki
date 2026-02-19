import { Worker, Job, Queue } from "bullmq";
import { generateColoringImage } from "@coloring/ai/generateImage.js";
import { generateSeoMetadata } from "@coloring/ai/tagger.js";
import { uploadBuffer } from "@coloring/storage";
import { prisma } from "@coloring/db";
import { TRANSLATE_PAGE_QUEUE } from "./translate-page.js";

// ─── Config ───────────────────────────────────────────────────────────────────

export const AI_GENERATE_QUEUE = "ai-generate";

/** After this many attempts the prompt is marked SKIPPED instead of FAILED */
const MAX_ATTEMPTS = parseInt(process.env.AI_MAX_ATTEMPTS ?? "2", 10);

/** Concurrency: how many images are generated in parallel */
const CONCURRENCY = parseInt(process.env.AI_CONCURRENCY ?? "2", 10);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiGeneratePayload {
  generationPromptId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isGenerationEnabled(): boolean {
  const val = (process.env.GENERATION_ENABLED ?? "true").toLowerCase();
  return val !== "false" && val !== "0";
}

function topicToSlug(topic: string): string {
  const base = topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

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

// ─── Processor ────────────────────────────────────────────────────────────────

async function processAiGenerateJob(
  job: Job<AiGeneratePayload>,
  connection: { host: string; port: number }
): Promise<void> {
  const { generationPromptId } = job.data;

  // ── Safety: GENERATION_ENABLED ────────────────────────────────────────────
  if (!isGenerationEnabled()) {
    console.warn(
      `[ai-generate] GENERATION_ENABLED=false – skipping job id=${job.id}`
    );
    return; // job completes without doing anything
  }

  console.log(
    `[ai-generate] start id=${job.id} generationPromptId=${generationPromptId}`
  );

  // 1. Fetch GenerationPrompt from DB
  const genPrompt = await prisma.generationPrompt.findUnique({
    where: { id: generationPromptId },
    include: { category: true },
  });

  if (!genPrompt) {
    throw new Error(
      `[ai-generate] GenerationPrompt not found: ${generationPromptId}`
    );
  }

  // ── Safety: already DONE or SKIPPED → skip silently ──────────────────────
  if (genPrompt.status === "DONE" || genPrompt.status === "SKIPPED") {
    console.log(
      `[ai-generate] prompt id=${generationPromptId} already ${genPrompt.status} – skipping`
    );
    return;
  }

  // Increment attempts counter
  const updated = await prisma.generationPrompt.update({
    where: { id: generationPromptId },
    data: { attempts: { increment: 1 }, status: "PROCESSING" },
  });

  const currentAttempts = updated.attempts;

  const { topic, promptText, locale } = genPrompt;
  const category = genPrompt.category.slug;

  console.log(
    `[ai-generate] topic="${topic}" locale="${locale}" category="${category}" attempt=${currentAttempts}/${MAX_ATTEMPTS}`
  );

  try {
    // 2. Generate image via OpenAI using promptText
    console.log(`[ai-generate] calling OpenAI image generation…`);
    const imageBuffer = await generateColoringImage(promptText);
    console.log(`[ai-generate] image generated size=${imageBuffer.length}B`);

    // 3. Build slug & R2 key
    const slug = topicToSlug(topic);
    const r2Key = `coloring/${locale}/${slug}.png`;

    // 4. Upload PNG to R2
    console.log(`[ai-generate] uploading to R2 key=${r2Key}`);
    const imageUrl = await uploadBuffer(r2Key, imageBuffer, "image/png");
    console.log(`[ai-generate] uploaded imageUrl=${imageUrl}`);

    // 5. Create ColoringPage record (status DRAFT initially)
    const page = await prisma.coloringPage.create({
      data: {
        slug,
        title: topic,
        category,
        imageUrl,
        sourcePrompt: promptText,
        locale,
        status: "DRAFT",
        published: false,
      },
    });

    console.log(
      `[ai-generate] ColoringPage created id=${page.id} slug=${page.slug}`
    );

    // 6. Call tagger — non-fatal if it fails
    try {
      console.log(`[ai-generate] calling tagger…`);
      const seo = await generateSeoMetadata(topic, locale);
      console.log(
        `[ai-generate] tagger done title="${seo.title}" tags=${seo.tags.join(", ")}`
      );

      // Upsert Tag records
      const tagIds: string[] = [];
      for (const tagName of seo.tags) {
        const tagSlug = tagToSlug(tagName);
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { slug: tagSlug, name: tagName, locale },
        });
        tagIds.push(tag.id);
      }

      // Update ColoringPage: attach tags + SEO fields (keep DRAFT until translated)
      await prisma.coloringPage.update({
        where: { id: page.id },
        data: {
          title: seo.title,
          description: seo.description,
          pageTags: { connect: tagIds.map((id) => ({ id })) },
        },
      });

      console.log(
        `[ai-generate] ColoringPage id=${page.id} updated tags=${tagIds.length} – enqueuing translate-page`
      );

      // Enqueue translate-page job (will publish once DEFAULT_LOCALE translation is saved)
      const translateQueue = new Queue(TRANSLATE_PAGE_QUEUE, {
        connection,
      });
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

      console.log(
        `[ai-generate] translate-page enqueued for pageId=${page.id}`
      );
    } catch (taggerErr) {
      console.warn(
        `[ai-generate] tagger failed for page id=${page.id}, leaving DRAFT (no translate-page enqueued)`,
        taggerErr
      );
    }

    // 7. Mark GenerationPrompt as DONE
    await prisma.generationPrompt.update({
      where: { id: generationPromptId },
      data: { status: "DONE" },
    });

    console.log(
      `[ai-generate] GenerationPrompt id=${generationPromptId} status=DONE`
    );
  } catch (err) {
    // ── Safety: max attempts → SKIPPED ────────────────────────────────────
    if (currentAttempts >= MAX_ATTEMPTS) {
      console.warn(
        `[ai-generate] prompt id=${generationPromptId} reached MAX_ATTEMPTS=${MAX_ATTEMPTS} → SKIPPED`
      );
      await prisma.generationPrompt.update({
        where: { id: generationPromptId },
        data: { status: "SKIPPED" },
      });
      // Do NOT re-throw — job completes so BullMQ won't retry
      return;
    }

    // Mark as FAILED so BullMQ retries
    await prisma.generationPrompt.update({
      where: { id: generationPromptId },
      data: { status: "FAILED" },
    });

    console.error(
      `[ai-generate] GenerationPrompt id=${generationPromptId} status=FAILED attempt=${currentAttempts}`,
      err
    );

    throw err; // re-throw so BullMQ handles retry
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createAiGenerateWorker(connection: {
  host: string;
  port: number;
}): Worker<AiGeneratePayload> {
  const worker = new Worker<AiGeneratePayload>(
    AI_GENERATE_QUEUE,
    async (job) => {
      await processAiGenerateJob(job, connection);
    },
    {
      connection,
      concurrency: CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[ai-generate] completed id=${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[ai-generate] failed id=${job?.id} attempt=${job?.attemptsMade}`,
      err.message
    );
  });

  console.log(
    `[ai-generate] listening on queue "${AI_GENERATE_QUEUE}" concurrency=${CONCURRENCY} maxAttempts=${MAX_ATTEMPTS} enabled=${isGenerationEnabled()}`
  );

  return worker;
}
