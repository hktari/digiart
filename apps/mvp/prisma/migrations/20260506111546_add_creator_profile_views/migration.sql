-- CreateTable
CREATE TABLE "CreatorProfileView" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cycleId" TEXT,

    CONSTRAINT "CreatorProfileView_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreatorProfileView" ADD CONSTRAINT "CreatorProfileView_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfileView" ADD CONSTRAINT "CreatorProfileView_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
