import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Ordered rules: first match wins.
// Each rule: [canonical category slug, keywords to match]
const RULES: Array<{ category: string; keywords: string[] }> = [
  { category: "dinosaurs",          keywords: ["dino"] },
  { category: "pets",               keywords: ["dog", "cat", "pet"] },
  { category: "farm-animals",       keywords: ["farm", "cow", "pig"] },
  { category: "wild-animals",       keywords: ["lion", "elephant", "zebra"] },
  { category: "ocean-animals",      keywords: ["fish", "shark", "octopus"] },
  { category: "birds",              keywords: ["bird", "eagle", "owl"] },
  { category: "cars",               keywords: ["car", "truck", "bus"] },
  { category: "emergency-vehicles", keywords: ["police", "fire", "ambulance"] },
  { category: "airplanes",          keywords: ["plane", "jet"] },
  { category: "trains",             keywords: ["train"] },
  { category: "dragons-fantasy",    keywords: ["dragon"] },
  { category: "princess-castles",   keywords: ["princess"] },
  { category: "alphabet",           keywords: ["letter", "alphabet"] },
  { category: "numbers",            keywords: ["number", "math"] },
  { category: "food-sweets",        keywords: ["cake", "ice-cream", "icecream", "ice cream"] },
  { category: "holidays",           keywords: ["christmas", "halloween", "easter"] },
];

const FALLBACK_CATEGORY = "world-countries";

/**
 * Returns the canonical category slug for a given page,
 * based on its slug, title, and tags.
 */
function resolveCategory(slug: string, title: string, tags: string[]): string {
  // Build a single lowercase search string from all three sources
  const haystack = [slug, title, ...tags].join(" ").toLowerCase();

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        return rule.category;
      }
    }
  }

  return FALLBACK_CATEGORY;
}

async function main() {
  console.log("🔄 Reassigning categories for all ColoringPages...\n");

  const pages = await prisma.coloringPage.findMany({
    select: { id: true, slug: true, title: true, tags: true, category: true },
  });

  console.log(`📄 Found ${pages.length} pages to process.\n`);

  const stats: Record<string, number> = {};
  let updated = 0;

  for (const page of pages) {
    const newCategory = resolveCategory(page.slug, page.title, page.tags);

    stats[newCategory] = (stats[newCategory] ?? 0) + 1;

    if (page.category !== newCategory) {
      await prisma.coloringPage.update({
        where: { id: page.id },
        data: { category: newCategory },
      });
      console.log(
        `  ✏️  [${page.slug}]  ${page.category} → ${newCategory}`
      );
      updated++;
    }
  }

  console.log(`\n✅ Done! Updated ${updated} / ${pages.length} pages.`);
  console.log("\n📊 Category distribution:");
  for (const [cat, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat.padEnd(25)} ${count}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ reassignCategories failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
