import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.js";
import { z } from "zod";
import type { SupportedLocale } from "@coloring/config/locales";

// ─── Config ───────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[@coloring/ai] Missing required environment variable: ${name}`);
  }
  return value;
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return _client;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

export const SeoMetadataSchema = z.object({
  title: z.string().max(60),
  description: z.string().max(155),
  altText: z.string(),
  tags: z.array(z.string()).min(5).max(10),
});

export type SeoMetadata = z.infer<typeof SeoMetadataSchema>;

// ─── Thin-fix schema ─────────────────────────────────────────────────────────

export const ThinFixSchema = z.object({
  description: z.string().min(120).max(300),
  seoTitle: z.string().max(60),
  seoDescription: z.string().max(155),
});

export type ThinFixMetadata = z.infer<typeof ThinFixSchema>;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates SEO metadata for a coloring page using OpenAI structured outputs.
 *
 * Constraints enforced by the Zod schema (and communicated to the model via
 * the system prompt):
 *   - title      ≤ 60 characters
 *   - description ≤ 155 characters
 *   - tags        5–10 items
 *
 * @param topic   Subject of the coloring page, e.g. "friendly dragon"
 * @param locale  Language code: "pl" | "en"
 * @returns       Validated {@link SeoMetadata} object
 */
export async function generateSeoMetadata(
  topic: string,
  locale: SupportedLocale
): Promise<SeoMetadata> {
  const client = getClient();

  const languageLabel = locale === "pl" ? "Polish" : "English";

  const systemPrompt = [
    `You are an SEO copywriter specialising in children's coloring pages.`,
    `Always respond in ${languageLabel}.`,
    `Rules:`,
    `- title: max 60 characters, catchy, child-friendly`,
    `- description: max 155 characters, suitable for a meta description`,
    `- altText: concise image alt text describing the coloring page`,
    `- tags: 5 to 10 lowercase keywords relevant to the image, no duplicates`,
  ].join("\n");

  const userPrompt = `Generate SEO metadata for a coloring page about: "${topic}"`;

  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(SeoMetadataSchema, "seo_metadata"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("[@coloring/ai] OpenAI returned no structured output");
  }

  // Validate once more with Zod to guarantee constraints
  return SeoMetadataSchema.parse(parsed);
}

/**
 * Generates improved description, seoTitle and seoDescription for a
 * "thin" ColoringPageTranslation using OpenAI structured outputs.
 *
 * @param title    Translated page title.
 * @param locale   BCP-47 locale string (e.g. "pl", "en", "de").
 * @param existing Current (possibly missing/short) field values.
 */
export async function generateThinFixMetadata(
  title: string,
  locale: string,
  existing: {
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  }
): Promise<ThinFixMetadata> {
  const client = getClient();

  const systemPrompt = [
    `You are an SEO copywriter specialising in children's coloring pages.`,
    `Always respond in the language matching locale "${locale}".`,
    `Rules:`,
    `- description: at least 120 characters, at most 300 characters, engaging paragraph about the coloring page`,
    `- seoTitle: max 60 characters, catchy, child-friendly`,
    `- seoDescription: max 155 characters, suitable for a meta description`,
    `Only regenerate fields that are missing or too short; keep existing good values.`,
  ].join("\n");

  const userPrompt = [
    `Coloring page title: "${title}"`,
    `Current description (may be empty or too short): "${existing.description ?? ""}"`,
    `Current seoTitle (may be empty): "${existing.seoTitle ?? ""}"`,
    `Current seoDescription (may be empty): "${existing.seoDescription ?? ""}"`,
    ``,
    `Generate improved values for all three fields.`,
  ].join("\n");

  const completion = await client.beta.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(ThinFixSchema as unknown as Parameters<typeof zodResponseFormat>[0], "thin_fix"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("[@coloring/ai] OpenAI returned no structured output for thin-fix");
  }

  return ThinFixSchema.parse(parsed);
}
