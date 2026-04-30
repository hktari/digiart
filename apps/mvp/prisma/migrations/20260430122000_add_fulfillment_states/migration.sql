CREATE TABLE "FulfillmentState" (
  "countryCode" TEXT NOT NULL,
  "stateCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "source" TEXT NOT NULL DEFAULT 'peecho',
  "syncedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FulfillmentState_pkey" PRIMARY KEY ("countryCode", "stateCode")
);

CREATE INDEX "FulfillmentState_countryCode_isActive_idx"
  ON "FulfillmentState"("countryCode", "isActive");
