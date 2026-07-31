-- A print file can now belong to a Collection instead of a (collector, cycle)
-- pair, so the collect funnel and the subscription cycle can share one booklet
-- pipeline. Both existing keys become nullable; Postgres treats NULLs as
-- distinct in a unique index, so the cycle constraint is unaffected by
-- collection rows and vice versa.

-- DropForeignKey
ALTER TABLE "GeneratedPrintFile" DROP CONSTRAINT "GeneratedPrintFile_collectorProfileId_fkey";

-- DropForeignKey
ALTER TABLE "GeneratedPrintFile" DROP CONSTRAINT "GeneratedPrintFile_cycleId_fkey";

-- AlterTable
ALTER TABLE "GeneratedPrintFile"
  ALTER COLUMN "collectorProfileId" DROP NOT NULL,
  ALTER COLUMN "cycleId" DROP NOT NULL,
  ADD COLUMN "collectionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPrintFile_collectionId_key" ON "GeneratedPrintFile"("collectionId");

-- AddForeignKey
ALTER TABLE "GeneratedPrintFile" ADD CONSTRAINT "GeneratedPrintFile_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPrintFile" ADD CONSTRAINT "GeneratedPrintFile_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPrintFile" ADD CONSTRAINT "GeneratedPrintFile_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
