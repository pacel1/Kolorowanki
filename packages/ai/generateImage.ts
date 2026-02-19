import OpenAI from "openai";

// ─── Config ───────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[@coloring/ai] Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy singleton
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return _client;
}

// ─── Style suffix ─────────────────────────────────────────────────────────────

const STYLE_SUFFIX =
  "black and white coloring page, thick outlines, no shading, white background, children friendly";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a coloring-page image for the given prompt using the OpenAI
 * Images API (gpt-image-1) and returns the raw PNG as a Buffer.
 *
 * The style constraints (black & white, thick outlines, no shading, white
 * background, children friendly) are always appended to the caller-supplied
 * prompt so they cannot be accidentally omitted.
 *
 * @param prompt  Subject description, e.g. "a friendly dragon sitting on a hill"
 * @returns       PNG image as a Node.js Buffer
 */
export async function generateColoringImage(prompt: string): Promise<Buffer> {
  const fullPrompt = `${prompt.trim()}, ${STYLE_SUFFIX}`;

  const client = getClient();

  const response = await client.images.generate({
    model: "gpt-image-1-mini",
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    quality: "medium",
    // gpt-image-1-mini always returns b64_json – response_format param not supported
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("[@coloring/ai] OpenAI returned no image data");
  }

  return Buffer.from(b64, "base64");
}
