/**
 * checkCategories.ts  –  Sanity check for Category and PromptCategory tables.
 *
 * Run with:
 *   pnpm --filter @coloring/db check:categories
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

async function main() {
  console.log("🔍 Checking Category and PromptCategory tables...\n");

  // ── Category ──────────────────────────────────────────────────────────────
  const categoryCount = await prisma.category.count();
  const firstCategories = await prisma.category.findMany({
    take: 5,
    orderBy: { slug: "asc" },
    select: { slug: true, name: true },
  });

  console.log(`📂 Category  count : ${categoryCount}`);
  console.log("   First 5 slugs  :", firstCategories.map((c) => c.slug).join(", "));

  // ── PromptCategory ────────────────────────────────────────────────────────
  const promptCategoryCount = await prisma.promptCategory.count();
  const promptCategoryActiveCount = await prisma.promptCategory.count({
    where: { isActive: true },
  });
  const firstPromptCategories = await prisma.promptCategory.findMany({
    take: 5,
    orderBy: { slug: "asc" },
    select: { slug: true, isActive: true },
  });

  console.log(`\n🤖 PromptCategory  count  : ${promptCategoryCount}`);
  console.log(`   PromptCategory  active : ${promptCategoryActiveCount}`);
  console.log(
    "   First 5 slugs         :",
    firstPromptCategories.map((c) => `${c.slug}(${c.isActive ? "✅" : "❌"})`).join(", ")
  );

  // ── Result ────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  if (categoryCount === 30 && promptCategoryActiveCount === 30) {
    console.log("✅ All good! 30 Category + 30 active PromptCategory records found.");
  } else {
    console.warn(
      `⚠️  Expected 30/30 – got Category: ${categoryCount}, PromptCategory active: ${promptCategoryActiveCount}`
    );
    console.warn("   Run: pnpm --filter @coloring/db seed:categories");
  }
}

main()
  .catch((e) => {
    console.error("❌ checkCategories failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
