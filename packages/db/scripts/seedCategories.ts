/**
 * seedCategories.ts
 *
 * Upserts the 30 canonical Category (frontend) and PromptCategory (AI pipeline)
 * records into the database.
 *
 * Run with:
 *   pnpm --filter @coloring/db seed:categories
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

// ESM-safe __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CANONICAL_CATEGORIES: string[] = [
  "dinosaurs",
  "pets",
  "farm-animals",
  "wild-animals",
  "forest-animals",
  "ocean-animals",
  "birds",
  "insects",
  "horses-unicorns",
  "cars",
  "construction-vehicles",
  "trains",
  "airplanes",
  "boats",
  "emergency-vehicles",
  "space-vehicles",
  "dragons-fantasy",
  "mermaids",
  "princess-castles",
  "knights-medieval",
  "cute-monsters",
  "superheroes",
  "alphabet",
  "numbers",
  "shapes-patterns",
  "world-countries",
  "professions",
  "food-sweets",
  "sports",
  "holidays",
];

const CANONICAL_SET = new Set(CANONICAL_CATEGORIES);

/** Convert "ocean-animals" → "Ocean Animals" */
function keyToName(key: string): string {
  return key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  console.log("🌱 Seeding canonical categories...\n");

  // ── Step 1: Deactivate PromptCategory records NOT in the canonical list ───
  const deactivated = await prisma.promptCategory.updateMany({
    where: { slug: { notIn: CANONICAL_CATEGORIES } },
    data: { isActive: false },
  });
  if (deactivated.count > 0) {
    console.log(
      `🔕 Deactivated ${deactivated.count} non-canonical PromptCategory record(s).`
    );
  }

  // ── Step 2: Upsert PromptCategory + Category for each canonical key ───────
  let promptCreated = 0;
  let promptUpdated = 0;
  let catCreated = 0;
  let catUpdated = 0;

  for (const key of CANONICAL_CATEGORIES) {
    const name = keyToName(key);

    // ── 2a. PromptCategory (AI pipeline) ──────────────────────────────────
    const promptResult = await prisma.promptCategory.upsert({
      where: { slug: key },
      update: { isActive: true },
      create: {
        slug: key,
        locale: "en",
        dailyQuota: 10,
        isActive: true,
        stylePreset:
          "black and white coloring page, thick outlines, no shading, white background, children friendly",
        seedKeywords: [],
        negativeKeywords: [],
      },
    });

    if (promptResult.updatedAt > promptResult.createdAt) {
      promptUpdated++;
    } else {
      promptCreated++;
    }

    // ── 2b. Category (frontend) ────────────────────────────────────────────
    // Category model has no isActive field – we rely on the seed creating
    // exactly the 30 canonical records and the API filtering by Category table.
    const catBefore = await prisma.category.findUnique({ where: { slug: key } });

    await prisma.category.upsert({
      where: { slug: key },
      update: { name, locale: "en" },
      create: {
        slug: key,
        name,
        locale: "en",
      },
    });

    if (catBefore) {
      catUpdated++;
      console.log(`  ✔  Category already existed (updated): ${key}`);
    } else {
      catCreated++;
      console.log(`  ✅ Created Category: ${key} ("${name}")`);
    }
  }

  // ── Step 3: Final counts ──────────────────────────────────────────────────
  const categoryCount = await prisma.category.count();
  const promptCategoryCount = await prisma.promptCategory.count();
  const promptCategoryActiveCount = await prisma.promptCategory.count({
    where: { isActive: true },
  });

  console.log(`
📊 Summary
  PromptCategory – created: ${promptCreated}, reactivated/updated: ${promptUpdated}
  Category       – created: ${catCreated}, already existed (updated): ${catUpdated}

📈 Final DB counts
  Category        total : ${categoryCount}
  PromptCategory  total : ${promptCategoryCount}  (active: ${promptCategoryActiveCount})

🎉 Done! Run translate-categories worker to generate CategoryTranslations.
`);
}

main()
  .catch((e) => {
    console.error("❌ seedCategories failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
