import { Queue } from "bullmq";
import { prisma } from "@coloring/db";
import { TRANSLATE_PAGE_QUEUE } from "../queues/translate-page.js";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
};

const queue = new Queue(TRANSLATE_PAGE_QUEUE, { connection });

const drafts = await prisma.coloringPage.findMany({
  where: { status: "DRAFT" },
  select: { id: true, slug: true },
});

if (drafts.length === 0) {
  console.log("[requeue-translate-drafts] No DRAFT pages found");
  await queue.close();
  await prisma.$disconnect();
  process.exit(0);
}

const jobs = await queue.addBulk(
  drafts.map((page) => ({
    name: "translate-page",
    data: { pageId: page.id },
  }))
);

console.log(
  `[requeue-translate-drafts] Enqueued ${jobs.length} translate-page jobs for ${drafts.length} DRAFT pages`
);

await queue.close();
await prisma.$disconnect();