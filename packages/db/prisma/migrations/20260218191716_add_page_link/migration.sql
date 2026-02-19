-- CreateEnum
CREATE TYPE "PageLinkType" AS ENUM ('TAG_RELATED', 'CATEGORY_RELATED', 'TRENDING');

-- CreateTable
CREATE TABLE "PageLink" (
    "id" TEXT NOT NULL,
    "fromPageId" TEXT NOT NULL,
    "toPageId" TEXT NOT NULL,
    "type" "PageLinkType" NOT NULL,
    "locale" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageLink_fromPageId_type_locale_idx" ON "PageLink"("fromPageId", "type", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "PageLink_fromPageId_toPageId_type_locale_key" ON "PageLink"("fromPageId", "toPageId", "type", "locale");

-- AddForeignKey
ALTER TABLE "PageLink" ADD CONSTRAINT "PageLink_fromPageId_fkey" FOREIGN KEY ("fromPageId") REFERENCES "ColoringPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageLink" ADD CONSTRAINT "PageLink_toPageId_fkey" FOREIGN KEY ("toPageId") REFERENCES "ColoringPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
