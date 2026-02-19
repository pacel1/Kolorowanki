-- CreateEnum
CREATE TYPE "GenerationPromptStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "PromptCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "dailyQuota" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stylePreset" TEXT,
    "seedKeywords" TEXT[],
    "negativeKeywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationPrompt" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" "GenerationPromptStatus" NOT NULL DEFAULT 'PENDING',
    "hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "GenerationPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromptCategory_slug_key" ON "PromptCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationPrompt_hash_key" ON "GenerationPrompt"("hash");

-- AddForeignKey
ALTER TABLE "GenerationPrompt" ADD CONSTRAINT "GenerationPrompt_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PromptCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
