-- CreateTable
CREATE TABLE "ScrapingRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "totalPosts" INTEGER NOT NULL DEFAULT 0,
    "filteredPosts" INTEGER NOT NULL DEFAULT 0,
    "qualifiedLeads" INTEGER NOT NULL DEFAULT 0,
    "hotLeads" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "ScrapingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passedFilter" BOOLEAN NOT NULL DEFAULT false,
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "qualifiedAt" TIMESTAMP(3),
    "score" INTEGER,
    "reasoning" TEXT,
    "isHotLead" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "scrapingRunId" TEXT NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PainPoint" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,

    CONSTRAINT "PainPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapingRun_startedAt_idx" ON "ScrapingRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_postId_key" ON "Lead"("postId");

-- CreateIndex
CREATE INDEX "Lead_subreddit_scrapedAt_idx" ON "Lead"("subreddit", "scrapedAt");

-- CreateIndex
CREATE INDEX "Lead_score_idx" ON "Lead"("score");

-- CreateIndex
CREATE INDEX "Lead_isHotLead_idx" ON "Lead"("isHotLead");

-- CreateIndex
CREATE INDEX "PainPoint_category_idx" ON "PainPoint"("category");

-- CreateIndex
CREATE INDEX "PainPoint_severity_idx" ON "PainPoint"("severity");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_scrapingRunId_fkey" FOREIGN KEY ("scrapingRunId") REFERENCES "ScrapingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PainPoint" ADD CONSTRAINT "PainPoint_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
