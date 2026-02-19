/**
 * seedCategoryTranslations.ts
 *
 * Upserts CategoryTranslation records for the 30 canonical categories.
 * Currently seeds: en (baseline) + es (Spanish).
 *
 * Run with:
 *   pnpm --filter @coloring/db seed:category-translations
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Translation data ─────────────────────────────────────────────────────────
// Format: { [canonicalSlug]: { [locale]: { name, slug } } }
// slug must be ASCII-only (no diacritics), lowercase, hyphens only.

const TRANSLATIONS: Record<string, Record<string, { name: string; slug: string }>> = {
  "dinosaurs": {
    en: { name: "Dinosaurs",           slug: "dinosaurs" },
    es: { name: "Dinosaurios",         slug: "dinosaurios" },
  },
  "pets": {
    en: { name: "Pets",                slug: "pets" },
    es: { name: "Mascotas",            slug: "mascotas" },
  },
  "farm-animals": {
    en: { name: "Farm Animals",        slug: "farm-animals" },
    es: { name: "Animales de granja",  slug: "animales-de-granja" },
  },
  "wild-animals": {
    en: { name: "Wild Animals",        slug: "wild-animals" },
    es: { name: "Animales salvajes",   slug: "animales-salvajes" },
  },
  "forest-animals": {
    en: { name: "Forest Animals",      slug: "forest-animals" },
    es: { name: "Animales del bosque", slug: "animales-del-bosque" },
  },
  "ocean-animals": {
    en: { name: "Ocean Animals",       slug: "ocean-animals" },
    es: { name: "Animales marinos",    slug: "animales-marinos" },
  },
  "birds": {
    en: { name: "Birds",               slug: "birds" },
    es: { name: "Pajaros",             slug: "pajaros" },
  },
  "insects": {
    en: { name: "Insects",             slug: "insects" },
    es: { name: "Insectos",            slug: "insectos" },
  },
  "horses-unicorns": {
    en: { name: "Horses & Unicorns",   slug: "horses-unicorns" },
    es: { name: "Caballos y unicornios", slug: "caballos-y-unicornios" },
  },
  "cars": {
    en: { name: "Cars",                slug: "cars" },
    es: { name: "Coches",              slug: "coches" },
  },
  "construction-vehicles": {
    en: { name: "Construction Vehicles", slug: "construction-vehicles" },
    es: { name: "Vehiculos de construccion", slug: "vehiculos-de-construccion" },
  },
  "trains": {
    en: { name: "Trains",              slug: "trains" },
    es: { name: "Trenes",              slug: "trenes" },
  },
  "airplanes": {
    en: { name: "Airplanes",           slug: "airplanes" },
    es: { name: "Aviones",             slug: "aviones" },
  },
  "boats": {
    en: { name: "Boats",               slug: "boats" },
    es: { name: "Barcos",              slug: "barcos" },
  },
  "emergency-vehicles": {
    en: { name: "Emergency Vehicles",  slug: "emergency-vehicles" },
    es: { name: "Vehiculos de emergencia", slug: "vehiculos-de-emergencia" },
  },
  "space-vehicles": {
    en: { name: "Space Vehicles",      slug: "space-vehicles" },
    es: { name: "Vehiculos espaciales", slug: "vehiculos-espaciales" },
  },
  "dragons-fantasy": {
    en: { name: "Dragons & Fantasy",   slug: "dragons-fantasy" },
    es: { name: "Dragones y fantasia", slug: "dragones-y-fantasia" },
  },
  "mermaids": {
    en: { name: "Mermaids",            slug: "mermaids" },
    es: { name: "Sirenas",             slug: "sirenas" },
  },
  "princess-castles": {
    en: { name: "Princesses & Castles", slug: "princess-castles" },
    es: { name: "Princesas y castillos", slug: "princesas-y-castillos" },
  },
  "knights-medieval": {
    en: { name: "Knights & Medieval",  slug: "knights-medieval" },
    es: { name: "Caballeros y medieval", slug: "caballeros-y-medieval" },
  },
  "cute-monsters": {
    en: { name: "Cute Monsters",       slug: "cute-monsters" },
    es: { name: "Monstruos adorables", slug: "monstruos-adorables" },
  },
  "superheroes": {
    en: { name: "Superheroes",         slug: "superheroes" },
    es: { name: "Superheroes",         slug: "superheroes" },
  },
  "alphabet": {
    en: { name: "Alphabet",            slug: "alphabet" },
    es: { name: "Alfabeto",            slug: "alfabeto" },
  },
  "numbers": {
    en: { name: "Numbers",             slug: "numbers" },
    es: { name: "Numeros",             slug: "numeros" },
  },
  "shapes-patterns": {
    en: { name: "Shapes & Patterns",   slug: "shapes-patterns" },
    es: { name: "Formas y patrones",   slug: "formas-y-patrones" },
  },
  "world-countries": {
    en: { name: "World & Countries",   slug: "world-countries" },
    es: { name: "Mundo y paises",      slug: "mundo-y-paises" },
  },
  "professions": {
    en: { name: "Professions",         slug: "professions" },
    es: { name: "Profesiones",         slug: "profesiones" },
  },
  "food-sweets": {
    en: { name: "Food & Sweets",       slug: "food-sweets" },
    es: { name: "Comida y dulces",     slug: "comida-y-dulces" },
  },
  "sports": {
    en: { name: "Sports",              slug: "sports" },
    es: { name: "Deportes",            slug: "deportes" },
  },
  "holidays": {
    en: { name: "Holidays",            slug: "holidays" },
    es: { name: "Fiestas",             slug: "fiestas" },
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌍 Seeding CategoryTranslations (en + es)...\n");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [canonicalSlug, localeMap] of Object.entries(TRANSLATIONS)) {
    // Find the Category record
    const category = await prisma.category.findUnique({
      where: { slug: canonicalSlug },
    });

    if (!category) {
      console.warn(`  ⚠️  Category not found in DB: ${canonicalSlug} – run seed:categories first`);
      skipped++;
      continue;
    }

    for (const [locale, { name, slug }] of Object.entries(localeMap)) {
      const existing = await prisma.categoryTranslation.findUnique({
        where: { categoryId_locale: { categoryId: category.id, locale } },
      });

      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale } },
        create: { categoryId: category.id, locale, name, slug },
        update: { name, slug },
      });

      if (existing) {
        updated++;
      } else {
        created++;
        console.log(`  ✅ [${locale}] ${canonicalSlug} → "${name}" (/${slug})`);
      }
    }
  }

  const total = await prisma.categoryTranslation.count();

  console.log(`
📊 Summary
  Created : ${created}
  Updated : ${updated}
  Skipped : ${skipped} (Category not in DB)

📈 CategoryTranslation total in DB: ${total}

🎉 Done!
`);
}

main()
  .catch((e) => {
    console.error("❌ seedCategoryTranslations failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
