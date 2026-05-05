-- AlterEnum
ALTER TYPE "BillingStatus" ADD VALUE 'GRACE_PERIOD';

-- AlterTable
ALTER TABLE "BillingRecord" ADD COLUMN     "creatorPayoutAmount" DECIMAL(10,2),
ADD COLUMN     "peechoOrderId" TEXT,
ADD COLUMN     "platformMarkupAmount" DECIMAL(10,2),
ADD COLUMN     "retailTotalAmount" DECIMAL(10,2),
ADD COLUMN     "wholesaleTotalAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "CheckoutIntent" ADD COLUMN     "peechoOrderId" TEXT,
ADD COLUMN     "platformMarkupAmount" DECIMAL(10,2),
ADD COLUMN     "retailTotalAmount" DECIMAL(10,2),
ADD COLUMN     "wholesaleTotalAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "CollectorProfile" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL,
    "creatorPayoutSplit" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "platformFeeSplit" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformConfig_updatedAt_idx" ON "PlatformConfig"("updatedAt");
