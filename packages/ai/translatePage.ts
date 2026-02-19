import OpenAI from "openai";
import { z } from "zod";
import { SUPPORTED_LOCALES } from "@coloring/config/locales";
import type { SupportedLocale } from "@coloring/config/locales";

// ─── Config ───────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[@coloring/ai] Missing env var: ${name}`);
  return value;
}

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return _client;
}

// ─── Input type ───────────────────────────────────────────────────────────────

export interface ColoringPageBaseData {
  /** Canonical title (source language, usually English) */
  title: string;
  /** Canonical description */
  description: string;
  /** Canonical category name */
  category: string;
  /** Canonical tag names */
  tags: string[];
  /** Alt text for the image (optional – falls back to title) */
  altText?: string;
}

// ─── Zod schemas ─────────────────────────────────────────────────────────────

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const SlugSchema = z
  .string()
  .min(1)
  .transform((value) => normalizeSlug(value))
  .refine(
    (value) => /^[a-z0-9-]+$/.test(value),
    "slug must be lowercase ASCII with hyphens only"
  );

const LocaleTranslationSchema = z.object({
  title: z.string().min(1).max(60),
  slug: SlugSchema,
  seoTitle: z.string().min(1).max(60),
  seoDescription: z.string().min(1).max(155),
  altText: z.string().min(1),
  description: z.string().min(1),
  tags: z
    .array(
      z.object({
        name: z.string().min(1),
        slug: SlugSchema,
      })
    )
    .min(1)
    .max(15),
  category: z.object({
    name: z.string().min(1),
    slug: SlugSchema,
  }),
});

export type LocaleTranslation = z.infer<typeof LocaleTranslationSchema>;

const TranslationBatchSchema = z.record(
  z.enum(SUPPORTED_LOCALES),
  LocaleTranslationSchema
);

export type TranslationBatch = z.infer<typeof TranslationBatchSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a locale code to a human-readable language name for the prompt.
 */
const LOCALE_LANGUAGE_MAP: Record<SupportedLocale, string> = {
  en: "English",
  es: "Spanish",
  "pt-BR": "Brazilian Portuguese",
  de: "German",
  fr: "French",
  it: "Italian",
  nl: "Dutch",
  tr: "Turkish",
  pl: "Polish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
};

function buildSystemPrompt(locales: SupportedLocale[]): string {
  const localeList = locales
    .map((l) => `"${l}" (${LOCALE_LANGUAGE_MAP[l]})`)
    .join(", ");

  return [
    `You are a professional SEO copywriter and localisation expert specialising in children's coloring pages.`,
    `Your task is to produce natural, child-friendly, SEO-optimised content for the following locales: ${localeList}.`,
    ``,
    `Rules:`,
    `- Write in the natural style of a native speaker – do NOT produce literal word-for-word translations.`,
    `- Tone: playful, child-friendly, engaging.`,
    `- title: max 60 characters, catchy, suitable for a page heading.`,
    `- seoTitle: max 60 characters, optimised for search engines (may differ from title).`,
    `- seoDescription: max 155 characters, compelling meta description.`,
    `- altText: concise image alt text (1–2 sentences) describing the coloring page.`,
    `- description: 1–3 sentences describing the coloring page for the page body.`,
    `- slug: lowercase, ASCII only, words separated by hyphens, no special characters.`,
    `- tags: 3–15 relevant keywords as { name, slug } objects; slug must follow the same slug rules.`,
    `- category: localised category name and slug.`,
    ``,
    `Respond ONLY with a valid JSON object matching this exact structure (no markdown, no code fences):`,
    `{`,
    `  "<locale>": {`,
    `    "title": string,`,
    `    "slug": string,`,
    `    "seoTitle": string,`,
    `    "seoDescription": string,`,
    `    "altText": string,`,
    `    "description": string,`,
    `    "tags": [{ "name": string, "slug": string }],`,
    `    "category": { "name": string, "slug": string }`,
    `  },`,
    `  ...`,
    `}`,
  ].join("\n");
}

function buildUserPrompt(
  base: ColoringPageBaseData,
  locales: SupportedLocale[]
): string {
  const localeList = locales.join(", ");
  return [
    `Translate and localise the following coloring page content for these locales: ${localeList}`,
    ``,
    `Source content (English):`,
    `- Title: ${base.title}`,
    `- Description: ${base.description}`,
    `- Category: ${base.category}`,
    `- Tags: ${base.tags.join(", ")}`,
    ...(base.altText ? [`- Alt text: ${base.altText}`] : []),
    ``,
    `Return the JSON object only.`,
  ].join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Translates a coloring page's metadata into multiple locales using OpenAI.
 *
 * @param baseData  Canonical (source) content for the coloring page.
 * @param locales   Target locales. Defaults to all SUPPORTED_LOCALES.
 * @returns         A {@link TranslationBatch} keyed by locale code.
 *
 * @throws if OpenAI returns invalid JSON or the response fails Zod validation.
 */
export async function translateColoringPage(
  baseData: ColoringPageBaseData,
  locales: SupportedLocale[] = [...SUPPORTED_LOCALES]
): Promise<TranslationBatch> {
  if (locales.length === 0) {
    throw new RangeError("[@coloring/ai] locales array must not be empty");
  }

  const client = getClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(locales) },
      { role: "user", content: buildUserPrompt(baseData, locales) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("[@coloring/ai] OpenAI returned empty content");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[@coloring/ai] OpenAI returned invalid JSON:\n${raw}`);
  }

  // Validate with Zod
  const result = TranslationBatchSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `[@coloring/ai] Translation schema validation failed:\n${result.error.message}\nRaw: ${raw}`
    );
  }

  return result.data;
}
