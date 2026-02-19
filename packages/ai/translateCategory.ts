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

// ─── Locale → language name ───────────────────────────────────────────────────

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

// ─── Zod schemas ──────────────────────────────────────────────────────────────

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

const CategoryLocaleSchema = z.object({
  /** Localised, human-readable category name */
  name: z.string().min(1).max(80),
  /**
   * SEO-friendly URL slug in the target language.
   * Must be natural in that language – NOT a transliteration of the English key.
   * Example: "dinosaurs" → pl: "dinozaury", de: "dinosaurier"
   */
  slug: SlugSchema,
});

export type CategoryLocaleTranslation = z.infer<typeof CategoryLocaleSchema>;

const CategoryTranslationBatchSchema = z.record(
  z.enum(SUPPORTED_LOCALES),
  CategoryLocaleSchema
);

export type CategoryTranslationBatch = z.infer<
  typeof CategoryTranslationBatchSchema
>;

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(locales: SupportedLocale[]): string {
  const localeList = locales
    .map((l) => `"${l}" (${LOCALE_LANGUAGE_MAP[l]})`)
    .join(", ");

  return [
    `You are a professional SEO copywriter and localisation expert specialising in children's coloring pages.`,
    `Your task is to translate a coloring-page category name into the following locales: ${localeList}.`,
    ``,
    `Rules:`,
    `- name: natural, child-friendly translation of the category name in the target language.`,
    `- slug: lowercase, ASCII only, words separated by hyphens, NO special characters, NO diacritics.`,
    `  The slug must be a natural SEO keyword in the target language – NOT a transliteration of the English key.`,
    `  Examples: "dinosaurs" → pl slug "dinozaury", de slug "dinosaurier", fr slug "dinosaures".`,
    `  Examples: "ocean-animals" → pl slug "zwierzeta-morskie", de slug "meerestiere".`,
    ``,
    `Respond ONLY with a valid JSON object (no markdown, no code fences):`,
    `{`,
    `  "<locale>": { "name": string, "slug": string },`,
    `  ...`,
    `}`,
  ].join("\n");
}

function buildUserPrompt(
  categoryKey: string,
  englishName: string,
  locales: SupportedLocale[]
): string {
  return [
    `Translate the following coloring-page category for locales: ${locales.join(", ")}`,
    ``,
    `Category key (English): ${categoryKey}`,
    `English display name: ${englishName}`,
    ``,
    `Return the JSON object only.`,
  ].join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Translates a single category name into multiple locales using OpenAI.
 *
 * @param categoryKey   The canonical English slug/key (e.g. "ocean-animals").
 * @param englishName   Human-readable English name (e.g. "Ocean Animals").
 * @param locales       Target locales. Defaults to all SUPPORTED_LOCALES.
 * @returns             A {@link CategoryTranslationBatch} keyed by locale code.
 */
export async function translateCategory(
  categoryKey: string,
  englishName: string,
  locales: SupportedLocale[] = [...SUPPORTED_LOCALES]
): Promise<CategoryTranslationBatch> {
  if (locales.length === 0) {
    throw new RangeError("[@coloring/ai] locales array must not be empty");
  }

  const client = getClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3, // lower temp for consistent slugs
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(locales) },
      { role: "user", content: buildUserPrompt(categoryKey, englishName, locales) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("[@coloring/ai] OpenAI returned empty content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[@coloring/ai] OpenAI returned invalid JSON:\n${raw}`);
  }

  const result = CategoryTranslationBatchSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `[@coloring/ai] Category translation schema validation failed:\n${result.error.message}\nRaw: ${raw}`
    );
  }

  return result.data;
}

/**
 * Converts a canonical slug key like "ocean-animals" to a title-cased
 * English display name like "Ocean Animals".
 */
export function keyToEnglishName(key: string): string {
  return key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
