-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "irrelevanceReason" TEXT,
ADD COLUMN     "isIrrelevant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "markedIrrelevantAt" TIMESTAMP(3),
ADD COLUMN     "markedIrrelevantBy" TEXT,
ADD COLUMN     "outreachNotes" TEXT,
ADD COLUMN     "reachedOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reachedOutAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lead_reachedOut_idx" ON "Lead"("reachedOut");

-- CreateIndex
CREATE INDEX "Lead_isIrrelevant_idx" ON "Lead"("isIrrelevant");
