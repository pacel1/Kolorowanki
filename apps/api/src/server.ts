import "dotenv/config";
import Fastify from "fastify";
import { prisma } from "@coloring/db";
import { SUPPORTED_LOCALES } from "@coloring/config/locales";

const app = Fastify({ logger: true });

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", async () => ({ ok: true }));

// ─── GET /categories ─────────────────────────────────────────────────────────
// Returns distinct categories derived from published ColoringPages,
// with page count per category.

app.get<{
  Querystring: { locale?: string };
}>("/categories", async (request, reply) => {
  const { locale } = request.query;

  try {
    // 1. Canonical Category records (with optional locale translation)
    const categoryRows = await (prisma as unknown as {
      category: { findMany: (args: unknown) => Promise<unknown> };
    }).category.findMany({
      orderBy: { slug: "asc" },
      include: {
        translations: locale
          ? { where: { locale } }
          : { where: { locale: "en" } },
        _count: { select: { translations: true } },
      },
    }) as Array<{
      id: string;
      slug: string;
      name: string;
      locale: string;
      translations: Array<{ name: string; slug: string; locale: string }>;
    }>;

    // 2. Page counts per canonical category slug
    const pageCounts = await prisma.coloringPage.groupBy({
      by: ["category"],
      where: { published: true },
      _count: { id: true },
    });
    const countMap = new Map(pageCounts.map((r) => [r.category, r._count.id]));

    // 3. Merge: prefer translated name/slug when available
    const categories = categoryRows.map((cat) => {
      const tr = cat.translations[0];
      return {
        slug: tr?.slug ?? cat.slug,
        canonicalSlug: cat.slug,
        name: tr?.name ?? cat.name,
        count: countMap.get(cat.slug) ?? 0,
      };
    });

    // NOTE: We intentionally return ONLY records from the Category table.
    // Run `pnpm --filter @coloring/db seed:categories` to populate 30 canonical
    // categories. Any ColoringPage.category values not in the Category table are
    // excluded from this endpoint on purpose.

    return reply.send({ categories });
  } catch (err) {
    app.log.error(err, "Failed to fetch categories");
    return reply.status(503).send({ categories: [], error: "Database unavailable" });
  }
});

// ─── GET /pages ───────────────────────────────────────────────────────────────

app.get<{
  Querystring: { category?: string; limit?: string };
}>("/pages", async (request, reply) => {
  const { category, limit } = request.query;
  const take = Math.min(Number(limit ?? 50), 200);

  try {
    const pages = await prisma.coloringPage.findMany({
      where: {
        published: true,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        thumbUrl: true,
        imageUrl: true,
        published: true,
        createdAt: true,
      },
    });

    return reply.send({ pages });
  } catch (err) {
    app.log.error(err, "Failed to fetch pages");
    return reply.status(503).send({ pages: [], error: "Database unavailable" });
  }
});

// ─── GET /pages/:slug ─────────────────────────────────────────────────────────

app.get<{
  Params: { slug: string };
}>("/pages/:slug", async (request, reply) => {
  const { slug } = request.params;

  try {
    const page = await prisma.coloringPage.findFirst({
      where: { slug, published: true },
    });

    if (!page) {
      return reply.status(404).send({ error: "Not found" });
    }

    return reply.send({ page });
  } catch (err) {
    app.log.error(err, "Failed to fetch page");
    return reply.status(503).send({ error: "Database unavailable" });
  }
});

// ─── GET /pages/tag/:tagSlug ──────────────────────────────────────────────────
// Returns published pages that have the given tag (by tag slug).

app.get<{
  Params: { tagSlug: string };
  Querystring: { limit?: string };
}>("/pages/tag/:tagSlug", async (request, reply) => {
  const { tagSlug } = request.params;
  const take = Math.min(Number(request.query.limit ?? 50), 200);

  try {
    const tag = await prisma.tag.findUnique({
      where: { slug: tagSlug },
      select: { id: true, slug: true, name: true, locale: true },
    });

    if (!tag) {
      return reply.status(404).send({ error: "Tag not found" });
    }

    const pages = await prisma.coloringPage.findMany({
      where: {
        published: true,
        pageTags: { some: { slug: tagSlug } },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        thumbUrl: true,
        imageUrl: true,
        published: true,
        createdAt: true,
      },
    });

    return reply.send({ tag, pages });
  } catch (err) {
    app.log.error(err, "Failed to fetch pages by tag");
    return reply.status(503).send({ tag: null, pages: [], error: "Database unavailable" });
  }
});

// ─── GET /pages/:slug/related ─────────────────────────────────────────────────
// Returns up to 8 published pages that share a tag or category with the given
// slug. The current page is excluded from the results.

app.get<{
  Params: { slug: string };
}>("/pages/:slug/related", async (request, reply) => {
  const { slug } = request.params;

  try {
    // 1. Fetch the current page (need its category and tag IDs)
    const current = await prisma.coloringPage.findFirst({
      where: { slug, published: true },
      select: {
        id: true,
        category: true,
        pageTags: { select: { id: true } },
      },
    });

    if (!current) {
      return reply.status(404).send({ error: "Not found" });
    }

    const tagIds = current.pageTags.map((t) => t.id);

    // 2. Find pages that share at least one tag OR the same category,
    //    excluding the current page, limited to 8.
    const related = await prisma.coloringPage.findMany({
      where: {
        published: true,
        id: { not: current.id },
        OR: [
          ...(tagIds.length > 0
            ? [{ pageTags: { some: { id: { in: tagIds } } } }]
            : []),
          { category: current.category },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        thumbUrl: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    return reply.send({ related });
  } catch (err) {
    app.log.error(err, "Failed to fetch related pages");
    return reply.status(503).send({ related: [], error: "Database unavailable" });
  }
});

// ─── POST /pack ───────────────────────────────────────────────────────────────
// Creates a new PackJob with status PENDING.
// Body: { pages: string[] }  – array of coloring page slugs

app.post<{
  Body: { pages: string[] };
}>("/pack", async (request, reply) => {
  const { pages } = request.body ?? {};

  if (!Array.isArray(pages) || pages.length === 0) {
    return reply.status(400).send({ error: "pages must be a non-empty array of slugs" });
  }

  try {
    const job = await prisma.packJob.create({
      data: { pages },
    });

    return reply.status(201).send({ job });
  } catch (err) {
    app.log.error(err, "Failed to create pack job");
    return reply.status(503).send({ error: "Database unavailable" });
  }
});

// ─── GET /pack/:id ────────────────────────────────────────────────────────────
// Returns a PackJob by id.

app.get<{
  Params: { id: string };
}>("/pack/:id", async (request, reply) => {
  const { id } = request.params;

  try {
    const job = await prisma.packJob.findUnique({ where: { id } });

    if (!job) {
      return reply.status(404).send({ error: "Job not found" });
    }

    return reply.send({ job });
  } catch (err) {
    app.log.error(err, "Failed to fetch pack job");
    return reply.status(503).send({ error: "Database unavailable" });
  }
});

// ─── GET /sitemap/pages ───────────────────────────────────────────────────────
// Returns slug + updatedAt for all PUBLISHED coloring pages (for sitemap use).

app.get<{
  Querystring: { locale?: string };
}>("/sitemap/pages", async (request, reply) => {
  const { locale } = request.query;

  try {
    const pages = await prisma.coloringPage.findMany({
      where: {
        status: "PUBLISHED",
        published: true,
        ...(locale ? { locale } : {}),
      },
      select: { slug: true, locale: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ pages });
  } catch (err) {
    app.log.error(err, "Failed to fetch sitemap pages");
    return reply.status(503).send({ pages: [], error: "Database unavailable" });
  }
});

// ─── GET /sitemap/tags ────────────────────────────────────────────────────────
// Returns slug + locale for all tags that have at least one PUBLISHED page.

app.get<{
  Querystring: { locale?: string };
}>("/sitemap/tags", async (request, reply) => {
  const { locale } = request.query;

  try {
    const tags = await prisma.tag.findMany({
      where: {
        ...(locale ? { locale } : {}),
        pages: {
          some: { status: "PUBLISHED", published: true },
        },
      },
      select: { slug: true, locale: true },
      orderBy: { slug: "asc" },
    });

    return reply.send({ tags });
  } catch (err) {
    app.log.error(err, "Failed to fetch sitemap tags");
    return reply.status(503).send({ tags: [], error: "Database unavailable" });
  }
});

// ─── PromptCategory helpers ───────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9-]+$/;

function validateCategory(body: unknown): { ok: true; data: PromptCategoryBody } | { ok: false; error: string } {
  const b = body as Record<string, unknown>;
  if (!b || typeof b !== "object") return { ok: false, error: "Body required" };

  const { slug, locale, dailyQuota, isActive, stylePreset, seedKeywords, negativeKeywords } = b;

  if (typeof slug !== "string" || slug.length < 2 || !SLUG_RE.test(slug))
    return { ok: false, error: "slug: min 2 chars, only [a-z0-9-]" };

  if (!SUPPORTED_LOCALES.includes(locale as typeof SUPPORTED_LOCALES[number]))
    return { ok: false, error: `locale: must be one of ${SUPPORTED_LOCALES.join(", ")}` };

  const quota = Number(dailyQuota);
  if (!Number.isInteger(quota) || quota < 1 || quota > 1000)
    return { ok: false, error: "dailyQuota: integer 1–1000" };

  if (!Array.isArray(seedKeywords) || seedKeywords.some((k) => typeof k !== "string"))
    return { ok: false, error: "seedKeywords: string[]" };

  if (!Array.isArray(negativeKeywords) || negativeKeywords.some((k) => typeof k !== "string"))
    return { ok: false, error: "negativeKeywords: string[]" };

  return {
    ok: true,
    data: {
      slug,
      locale: locale as "pl" | "en",
      dailyQuota: quota,
      isActive: isActive !== false,
      stylePreset: typeof stylePreset === "string" ? stylePreset : undefined,
      seedKeywords: seedKeywords as string[],
      negativeKeywords: negativeKeywords as string[],
    },
  };
}

interface PromptCategoryBody {
  slug: string;
  locale: string;
  dailyQuota: number;
  isActive: boolean;
  stylePreset?: string;
  seedKeywords: string[];
  negativeKeywords: string[];
}

// ─── GET /prompt-categories ───────────────────────────────────────────────────

app.get<{ Querystring: { locale?: string; isActive?: string } }>(
  "/prompt-categories",
  async (request, reply) => {
    const { locale, isActive } = request.query;
    try {
      const categories = await prisma.promptCategory.findMany({
        where: {
          ...(locale ? { locale } : {}),
          ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { prompts: true } } },
      });
      return reply.send({ categories });
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({ error: "Database unavailable" });
    }
  }
);

// ─── GET /prompt-categories/:id ───────────────────────────────────────────────

app.get<{ Params: { id: string } }>(
  "/prompt-categories/:id",
  async (request, reply) => {
    try {
      const category = await prisma.promptCategory.findUnique({
        where: { id: request.params.id },
        include: { _count: { select: { prompts: true } } },
      });
      if (!category) return reply.status(404).send({ error: "Not found" });
      return reply.send({ category });
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({ error: "Database unavailable" });
    }
  }
);

// ─── POST /prompt-categories ──────────────────────────────────────────────────

app.post("/prompt-categories", async (request, reply) => {
  const validation = validateCategory(request.body);
  if (!validation.ok) return reply.status(400).send({ error: validation.error });

  const { slug, locale, ...rest } = validation.data;

  // Unique slug+locale check
  const existing = await prisma.promptCategory.findFirst({ where: { slug, locale } });
  if (existing) {
    return reply.status(409).send({ error: `Category with slug '${slug}' and locale '${locale}' already exists` });
  }

  try {
    const category = await prisma.promptCategory.create({
      data: { slug, locale, ...rest },
    });
    return reply.status(201).send({ category });
  } catch (err) {
    app.log.error(err);
    return reply.status(503).send({ error: "Database unavailable" });
  }
});

// ─── PUT /prompt-categories/:id ───────────────────────────────────────────────

app.put<{ Params: { id: string } }>(
  "/prompt-categories/:id",
  async (request, reply) => {
    const { id } = request.params;
    const validation = validateCategory(request.body);
    if (!validation.ok) return reply.status(400).send({ error: validation.error });

    const { slug, locale, ...rest } = validation.data;

    // Unique slug+locale check (exclude current record)
    const existing = await prisma.promptCategory.findFirst({
      where: { slug, locale, NOT: { id } },
    });
    if (existing) {
      return reply.status(409).send({ error: `Category with slug '${slug}' and locale '${locale}' already exists` });
    }

    try {
      const category = await prisma.promptCategory.update({
        where: { id },
        data: { slug, locale, ...rest },
      });
      return reply.send({ category });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Record to update not found")) {
        return reply.status(404).send({ error: "Not found" });
      }
      app.log.error(err);
      return reply.status(503).send({ error: "Database unavailable" });
    }
  }
);

// ─── DELETE /prompt-categories/:id ───────────────────────────────────────────

app.delete<{ Params: { id: string } }>(
  "/prompt-categories/:id",
  async (request, reply) => {
    try {
      await prisma.promptCategory.delete({ where: { id: request.params.id } });
      return reply.status(204).send();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Record to delete does not exist")) {
        return reply.status(404).send({ error: "Not found" });
      }
      app.log.error(err);
      return reply.status(503).send({ error: "Database unavailable" });
    }
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen({ port: 4000, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
