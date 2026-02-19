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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratePromptBatchInput {
  /** Category name / topic area, e.g. "dinozaury" */
  category: string;
  /** Language for topic names */
  locale: SupportedLocale;
  /** How many prompts to generate */
  count: number;
  /** Optional style hint from PromptCategory.stylePreset */
  stylePreset?: string;
  /** Seed keywords to inspire topics */
  seedKeywords?: string[];
  /** Words/concepts to avoid in the image */
  negativeKeywords?: string[];
}

export interface PromptItem {
  topic: string;
  promptText: string;
}

// ─── Zod validation schema ────────────────────────────────────────────────────

const PromptItemSchema = z.object({
  topic: z.string().min(1),
  promptText: z.string().min(10),
});

const PromptBatchSchema = z.object({
  prompts: z.array(PromptItemSchema).min(1),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STYLE_CONSTRAINTS = [
  "black and white coloring page",
  "thick outlines",
  "white background",
  "no shading",
  "no grayscale",
  "no text",
  "no watermark",
  "composition centered",
  "printable",
  "kid-friendly",
].join(", ");

function buildSystemPrompt(locale: SupportedLocale): string {
  const lang = locale === "pl" ? "Polish" : "English";
  return [
    `You are a creative assistant that generates image prompts for children's coloring pages.`,
    `Always respond with a valid JSON object matching this schema:`,
    `{ "prompts": [ { "topic": string, "promptText": string } ] }`,
    `Rules:`,
    `- "topic" must be a short, descriptive name in ${lang} (2–6 words)`,
    `- "promptText" must be in English, suitable for an image generation model`,
    `- Every promptText MUST include these style constraints: ${STYLE_CONSTRAINTS}`,
    `- Do NOT include any markdown, code fences, or extra text – only the JSON object`,
  ].join("\n");
}

function buildUserPrompt(input: GeneratePromptBatchInput): string {
  const {
    category,
    locale,
    count,
    stylePreset,
    seedKeywords = [],
    negativeKeywords = [],
  } = input;

  const lang = locale === "pl" ? "Polish" : "English";
  const lines: string[] = [
    `Generate exactly ${count} unique coloring page prompt(s) for the category: "${category}".`,
    `Topic names should be in ${lang}.`,
  ];

  if (stylePreset) {
    lines.push(`Style preference: ${stylePreset}`);
  }

  if (seedKeywords.length > 0) {
    lines.push(`Inspire topics from these keywords (use some, not all): ${seedKeywords.join(", ")}`);
  }

  if (negativeKeywords.length > 0) {
    lines.push(`Avoid these concepts in the image: ${negativeKeywords.join(", ")}`);
  }

  lines.push(
    `Each promptText must contain: ${STYLE_CONSTRAINTS}`,
    `Return only the JSON object.`,
  );

  return lines.join("\n");
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Calls OpenAI chat completion to generate a batch of coloring-page prompts.
 * Returns an array of { topic, promptText } objects validated with Zod.
 *
 * @throws if OpenAI returns invalid JSON or the schema doesn't match
 */
export async function generatePromptBatch(
  input: GeneratePromptBatchInput,
): Promise<PromptItem[]> {
  const { count } = input;
  if (count < 1 || count > 50) {
    throw new RangeError("count must be between 1 and 50");
  }

  const client = getClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.9,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(input.locale) },
      { role: "user", content: buildUserPrompt(input) },
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
  const result = PromptBatchSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `[@coloring/ai] Response schema validation failed:\n${result.error.message}\nRaw: ${raw}`,
    );
  }

  const items = result.data.prompts;

  // Trim to requested count (model may return more)
  return items.slice(0, count);
}
