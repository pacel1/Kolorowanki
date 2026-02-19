-- CreateEnum
CREATE TYPE "ColoringPageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PackJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "ColoringPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "imageUrl" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "status" "ColoringPageStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sourcePrompt" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColoringPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackJob" (
    "id" TEXT NOT NULL,
    "status" "PackJobStatus" NOT NULL DEFAULT 'PENDING',
    "pages" TEXT[],
    "resultUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColoringPage_slug_key" ON "ColoringPage"("slug");
