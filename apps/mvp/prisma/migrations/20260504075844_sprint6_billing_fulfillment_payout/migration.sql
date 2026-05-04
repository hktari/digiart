-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "PricingQuoteSnapshot" ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "isFrozen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "markupAmount" DECIMAL(10,2),
ADD COLUMN     "quoteMetadataHash" TEXT;

-- CreateTable
CREATE TABLE "CheckoutIntent" (
    "id" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectionSnapshot" JSONB NOT NULL,
    "quoteInputCountry" TEXT,
    "quoteInputPageCount" INTEGER,
    "acceptedEstimateDisclaimer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "quoteSnapshotId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentOrder" (
    "id" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "generatedPrintFileId" TEXT NOT NULL,
    "quoteSnapshotId" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "errorMessage" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutCalculation" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "totalMarkupPool" DECIMAL(10,2) NOT NULL,
    "totalPaidCollectors" INTEGER NOT NULL,
    "totalFulfilledCollectors" INTEGER NOT NULL,
    "calculationSnapshot" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPayout" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paypalBatchId" TEXT,
    "paypalPayoutId" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutIntent_collectorProfileId_cycleId_key" ON "CheckoutIntent"("collectorProfileId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRecord_collectorProfileId_cycleId_key" ON "BillingRecord"("collectorProfileId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentOrder_generatedPrintFileId_key" ON "FulfillmentOrder"("generatedPrintFileId");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentOrder_collectorProfileId_cycleId_key" ON "FulfillmentOrder"("collectorProfileId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutCalculation_cycleId_key" ON "PayoutCalculation"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPayout_creatorProfileId_cycleId_key" ON "CreatorPayout"("creatorProfileId", "cycleId");

-- AddForeignKey
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_quoteSnapshotId_fkey" FOREIGN KEY ("quoteSnapshotId") REFERENCES "PricingQuoteSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_generatedPrintFileId_fkey" FOREIGN KEY ("generatedPrintFileId") REFERENCES "GeneratedPrintFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_quoteSnapshotId_fkey" FOREIGN KEY ("quoteSnapshotId") REFERENCES "PricingQuoteSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutCalculation" ADD CONSTRAINT "PayoutCalculation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayout" ADD CONSTRAINT "CreatorPayout_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayout" ADD CONSTRAINT "CreatorPayout_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
