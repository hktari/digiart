-- CreateEnum
CREATE TYPE "FulfillmentRegion" AS ENUM ('EU', 'US');

-- CreateTable
CREATE TABLE "FulfillmentCountry" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "FulfillmentRegion" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'peecho',
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentCountry_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "FulfillmentCountry_region_isActive_idx" ON "FulfillmentCountry"("region", "isActive");
