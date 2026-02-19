import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.coloringPage.deleteMany();

  // ── PromptCategory seed ──────────────────────────────────────────────────
  await prisma.promptCategory.upsert({
    where: { slug: "dinozaury-pl" },
    update: {},
    create: {
      slug: "dinozaury-pl",
      locale: "pl",
      dailyQuota: 10,
      isActive: true,
      stylePreset: "black and white coloring page, thick outlines, no shading, white background, children friendly",
      seedKeywords: ["dinozaur", "prehistoryczny", "jurajski", "T-Rex", "triceratops", "brachiosaurus", "pterodaktyl", "stegozaur"],
      negativeKeywords: ["kolor", "realistyczny", "fotografia", "krwawy"],
    },
  });

  await prisma.promptCategory.upsert({
    where: { slug: "kosmos-pl" },
    update: {},
    create: {
      slug: "kosmos-pl",
      locale: "pl",
      dailyQuota: 10,
      isActive: true,
      stylePreset: "black and white coloring page, thick outlines, no shading, white background, children friendly",
      seedKeywords: ["rakieta", "astronauta", "planeta", "gwiazdy", "księżyc", "UFO", "kosmonauta", "galaktyka"],
      negativeKeywords: ["kolor", "realistyczny", "fotografia"],
    },
  });

  console.log("✅ PromptCategory seed done – 2 categories upserted.");

  const pages = await prisma.coloringPage.createMany({
    data: [
      {
        slug: "dino-t-rex",
        title: "Dinozaur T-Rex",
        description: "Prosta kolorowanka dinozaura do druku.",
        category: "dinozaury",
        tags: ["dino", "t-rex", "dla-dzieci"],
        imageUrl: "https://placehold.co/1024x1024?text=T-REX",
        thumbUrl: "https://placehold.co/400x400?text=T-REX",
        published: true,
      },
      {
        slug: "space-rocket",
        title: "Rakieta w kosmosie",
        description: "Kolorowanka rakiety kosmicznej.",
        category: "kosmos",
        tags: ["kosmos", "rakieta"],
        imageUrl: "https://placehold.co/1024x1024?text=ROCKET",
        thumbUrl: "https://placehold.co/400x400?text=ROCKET",
        published: true,
      },
      {
        slug: "cute-cat",
        title: "Słodki kot",
        description: "Kolorowanka uroczego kota.",
        category: "zwierzeta",
        tags: ["kot", "zwierzeta", "dla-dzieci"],
        imageUrl: "https://placehold.co/1024x1024?text=CAT",
        thumbUrl: "https://placehold.co/400x400?text=CAT",
        published: true,
      },
      {
        slug: "ocean-fish",
        title: "Ryba w oceanie",
        description: "Kolorowanka kolorowej ryby.",
        category: "ocean",
        tags: ["ryba", "ocean", "morze"],
        imageUrl: "https://placehold.co/1024x1024?text=FISH",
        thumbUrl: "https://placehold.co/400x400?text=FISH",
        published: true,
      },
      {
        slug: "magic-castle",
        title: "Magiczny zamek",
        description: "Kolorowanka bajkowego zamku.",
        category: "bajki",
        tags: ["zamek", "bajka", "magia"],
        imageUrl: "https://placehold.co/1024x1024?text=CASTLE",
        thumbUrl: "https://placehold.co/400x400?text=CASTLE",
        published: true,
      },
      {
        slug: "sunny-flower",
        title: "Słonecznik",
        description: "Kolorowanka słonecznika.",
        category: "kwiaty",
        tags: ["kwiat", "slonecznik", "przyroda"],
        imageUrl: "https://placehold.co/1024x1024?text=FLOWER",
        thumbUrl: "https://placehold.co/400x400?text=FLOWER",
        published: true,
      },
    ],
  });

  console.log(`✅ Seed done – inserted ${pages.count} records.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
