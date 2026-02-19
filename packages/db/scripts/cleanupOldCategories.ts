import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The canonical set of category slugs (same list as in seedCategories.ts)
const CANONICAL_SLUGS = new Set([
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
]);

async function main() {
  console.log("🧹 Cleaning up old Category records...\n");

  // Fetch all Category records (slug only)
  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });

  console.log(`📋 Total categories in DB: ${allCategories.length}`);

  // Filter out those NOT in the canonical list
  const toDelete = allCategories.filter((c) => !CANONICAL_SLUGS.has(c.slug));

  if (toDelete.length === 0) {
    console.log("✅ Nothing to delete — all categories are canonical.");
    return;
  }

  console.log(`\n🗑️  Categories to delete (${toDelete.length}):`);
  for (const c of toDelete) {
    console.log(`   - ${c.slug} (id: ${c.id})`);
  }

  // Delete them (CategoryTranslation rows are cascade-deleted by the DB)
  const result = await prisma.category.deleteMany({
    where: {
      id: { in: toDelete.map((c) => c.id) },
    },
  });

  console.log(`\n✅ Deleted ${result.count} old category record(s).`);
}

main()
  .catch((e) => {
    console.error("❌ cleanupOldCategories failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
