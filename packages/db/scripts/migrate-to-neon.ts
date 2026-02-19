/**
 * Data migration script: copies all data from local dev database to Neon.
 *
 * Usage:
 *   pnpm --filter @coloring/db tsx scripts/migrate-to-neon.ts
 *
 * Requirements:
 *   - Local database must be running (docker compose up -d)
 *   - Neon DATABASE_URL must be set in packages/db/.env
 *   - Run "pnpm --filter @coloring/db db:push" first to create schema in Neon
 *
 * What gets migrated:
 *   - Category, CategoryTranslation
 *   - Tag, TagTranslation
 *   - ColoringPage, ColoringPageTranslation
 *   - PageLink
 *   - PromptCategory, GenerationPrompt
 *   - PackJob
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Local dev database (source)
const LOCAL_DB = 'postgresql://postgres:postgres@localhost:5432/coloring_portal?schema=public';

// Target database - uses DATABASE_URL from .env (should be Neon)
const TARGET_DB = process.env.DATABASE_URL ?? '';

if (!TARGET_DB) {
  console.error('[migrate] ERROR: DATABASE_URL not set in packages/db/.env');
  console.error('[migrate] Please ensure Neon URL is configured');
  process.exit(1);
}

const source = new PrismaClient({
  datasources: {
    db: { url: LOCAL_DB },
  },
});

const target = new PrismaClient({
  datasources: {
    db: { url: TARGET_DB },
  },
});

async function migrate() {
  console.log('[migrate] Starting migration from local DB to Neon...');
  console.log('[migrate] Source:', LOCAL_DB.replace(/:.+@/, ':****@'));
  console.log('[migrate] Target:', TARGET_DB.replace(/:.+@/, ':****@'));

  try {
    // Clear target database first (to avoid FK issues)
    console.log('\n[migrate] Clearing target database...');
    await target.packJob.deleteMany();
    await target.generationPrompt.deleteMany();
    await target.promptCategory.deleteMany();
    await target.pageLink.deleteMany();
    await target.coloringPageTranslation.deleteMany();
    await target.coloringPage.deleteMany();
    await target.tagTranslation.deleteMany();
    await target.tag.deleteMany();
    await target.categoryTranslation.deleteMany();
    await target.category.deleteMany();
    console.log('[migrate] ✓ Target database cleared');

    // Test connections
    console.log('\n[migrate] Testing connections...');
    await source.$connect();
    console.log('[migrate] ✓ Source connected');
    await target.$connect();
    console.log('[migrate] ✓ Target connected');

    // Migrate Categories
    console.log('\n[migrate] Migrating Categories...');
    const categories = await source.category.findMany();
    console.log(`[migrate]   Found ${categories.length} categories`);
    let migrated = 0;
    for (const cat of categories) {
      try {
        await target.category.create({ data: cat });
        migrated++;
      } catch (e: unknown) {
        // Ignore duplicates - check Prisma error code P2002
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          // Duplicate - skip
        } else {
          throw e;
        }
      }
    }
    console.log(`[migrate]   ✓ Migrated ${migrated} categories`);

    // Migrate CategoryTranslations
    console.log('\n[migrate] Migrating CategoryTranslations...');
    const categoryTranslations = await source.categoryTranslation.findMany();
    console.log(`[migrate]   Found ${categoryTranslations.length} translations`);
    for (const tr of categoryTranslations) {
      await target.categoryTranslation.upsert({
        where: { id: tr.id },
        update: tr,
        create: tr,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${categoryTranslations.length} translations`);

    // Migrate Tags
    console.log('\n[migrate] Migrating Tags...');
    const tags = await source.tag.findMany();
    console.log(`[migrate]   Found ${tags.length} tags`);
    for (const tag of tags) {
      await target.tag.upsert({
        where: { id: tag.id },
        update: tag,
        create: tag,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${tags.length} tags`);

    // Migrate TagTranslations
    console.log('\n[migrate] Migrating TagTranslations...');
    const tagTranslations = await source.tagTranslation.findMany();
    console.log(`[migrate]   Found ${tagTranslations.length} tag translations`);
    for (const tr of tagTranslations) {
      await target.tagTranslation.upsert({
        where: { id: tr.id },
        update: tr,
        create: tr,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${tagTranslations.length} tag translations`);

    // Migrate ColoringPages
    console.log('\n[migrate] Migrating ColoringPages...');
    const pages = await source.coloringPage.findMany();
    console.log(`[migrate]   Found ${pages.length} pages`);
    for (const page of pages) {
      await target.coloringPage.upsert({
        where: { id: page.id },
        update: page,
        create: page,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${pages.length} pages`);

    // Migrate ColoringPageTranslations
    console.log('\n[migrate] Migrating ColoringPageTranslations...');
    const pageTranslations = await source.coloringPageTranslation.findMany();
    console.log(`[migrate]   Found ${pageTranslations.length} page translations`);
    for (const tr of pageTranslations) {
      await target.coloringPageTranslation.upsert({
        where: { id: tr.id },
        update: tr,
        create: tr,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${pageTranslations.length} page translations`);

    // Migrate PageLinks
    console.log('\n[migrate] Migrating PageLinks...');
    const pageLinks = await source.pageLink.findMany();
    console.log(`[migrate]   Found ${pageLinks.length} page links`);
    for (const link of pageLinks) {
      await target.pageLink.upsert({
        where: { id: link.id },
        update: link,
        create: link,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${pageLinks.length} page links`);

    // Migrate PromptCategories
    console.log('\n[migrate] Migrating PromptCategories...');
    const promptCategories = await source.promptCategory.findMany();
    console.log(`[migrate]   Found ${promptCategories.length} prompt categories`);
    for (const cat of promptCategories) {
      await target.promptCategory.upsert({
        where: { id: cat.id },
        update: cat,
        create: cat,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${promptCategories.length} prompt categories`);

    // Migrate GenerationPrompts
    console.log('\n[migrate] Migrating GenerationPrompts...');
    const prompts = await source.generationPrompt.findMany();
    console.log(`[migrate]   Found ${prompts.length} generation prompts`);
    for (const p of prompts) {
      await target.generationPrompt.upsert({
        where: { id: p.id },
        update: p,
        create: p,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${prompts.length} generation prompts`);

    // Migrate PackJobs
    console.log('\n[migrate] Migrating PackJobs...');
    const packJobs = await source.packJob.findMany();
    console.log(`[migrate]   Found ${packJobs.length} pack jobs`);
    for (const job of packJobs) {
      await target.packJob.upsert({
        where: { id: job.id },
        update: job,
        create: job,
      });
    }
    console.log(`[migrate]   ✓ Migrated ${packJobs.length} pack jobs`);

    console.log('\n[✅ migrate] Migration completed successfully!');
    console.log(`[migrate] Total: ${categories.length} cats, ${tags.length} tags, ${pages.length} pages`);

  } catch (error) {
    console.error('\n[❌ migrate] Migration failed:', error);
    process.exit(1);
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

migrate();
