-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "sourceHandle" TEXT;

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "collectorLeadId" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectedItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sourceHandle" TEXT NOT NULL,
    "sourcePostUrl" TEXT,
    "caption" TEXT,
    "creatorLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_token_key" ON "Collection"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_collectorLeadId_key" ON "Collection"("collectorLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_ownerUserId_key" ON "Collection"("ownerUserId");

-- CreateIndex
CREATE INDEX "Collection_ownerUserId_idx" ON "Collection"("ownerUserId");

-- CreateIndex
CREATE INDEX "CollectedItem_sourceHandle_idx" ON "CollectedItem"("sourceHandle");

-- CreateIndex
CREATE INDEX "CollectedItem_creatorLeadId_idx" ON "CollectedItem"("creatorLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectedItem_collectionId_imageId_key" ON "CollectedItem"("collectionId", "imageId");

-- CreateIndex
CREATE INDEX "Lead_sourceHandle_idx" ON "Lead"("sourceHandle");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_collectorLeadId_fkey" FOREIGN KEY ("collectorLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectedItem" ADD CONSTRAINT "CollectedItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectedItem" ADD CONSTRAINT "CollectedItem_creatorLeadId_fkey" FOREIGN KEY ("creatorLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
