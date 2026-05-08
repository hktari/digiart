-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CREATOR', 'COLLECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OnboardingState" AS ENUM ('PENDING', 'SHIPPING_SET', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('PORTRAIT', 'LANDSCAPE', 'SQUARE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('OPEN', 'LOCKED', 'PROCESSING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "PodEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FulfillmentRegion" AS ENUM ('EU', 'US');

-- CreateEnum
CREATE TYPE "PrintFileStatus" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED', 'GRACE_PERIOD');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailNotificationType" AS ENUM ('CREATOR_WELCOME', 'CREATOR_ONBOARDING_INCOMPLETE', 'CREATOR_RELEASE_REMINDER', 'CREATOR_RELEASE_MISSING_WARNING', 'CREATOR_RELEASE_PUBLISHED', 'CREATOR_COLLECTOR_AT_RISK', 'COLLECTOR_WELCOME', 'COLLECTOR_SETUP_REMINDER', 'COLLECTOR_PRICE_ESTIMATE', 'COLLECTOR_SELECTION_REMINDER', 'COLLECTOR_LOCK_REMINDER', 'COLLECTOR_LOCK_CONFIRMED', 'COLLECTOR_CREATOR_AT_RISK', 'COLLECTOR_FULFILLMENT_BLOCKED');

-- CreateEnum
CREATE TYPE "EmailNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('CREATOR', 'COLLECTOR');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'DISQUALIFIED', 'SIGNED_UP', 'ACTIVATED');

-- CreateEnum
CREATE TYPE "EntryPageType" AS ENUM ('HOME', 'CREATOR_PAGE', 'BROWSE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "sourcePlatform" TEXT,
    "referralCode" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorPayoutProfile" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "bankAccountInfo" TEXT,
    "paypalEmail" TEXT,
    "paypalAccountId" TEXT,
    "isPayPalVerified" BOOLEAN NOT NULL DEFAULT false,
    "payPalVerifiedAt" TIMESTAMP(3),
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorPayoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSocialLink" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreatorSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "shippingCountry" TEXT,
    "shippingStateCode" TEXT,
    "shippingName" TEXT,
    "shippingAddressLine1" TEXT,
    "shippingAddressLine2" TEXT,
    "shippingCity" TEXT,
    "shippingZip" TEXT,
    "stripeCustomerId" TEXT,
    "onboardingState" "OnboardingState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "orientation" "Orientation" NOT NULL DEFAULT 'UNKNOWN',
    "status" "ArtworkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "cycleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "artworkLimit" INTEGER NOT NULL DEFAULT 10,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseArtwork" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReleaseArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseTag" (
    "releaseId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ReleaseTag_pkey" PRIMARY KEY ("releaseId","tagId")
);

-- CreateTable
CREATE TABLE "CollectorCreatorSubscription" (
    "id" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "entryCreatorId" TEXT,
    "referralCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectorCreatorSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectorReleaseSelection" (
    "id" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectorReleaseSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionCycle" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "selectionOpenDate" TIMESTAMP(3) NOT NULL,
    "lockDate" TIMESTAMP(3) NOT NULL,
    "fulfillmentDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletConstraint" (
    "id" TEXT NOT NULL,
    "minPages" INTEGER NOT NULL,
    "maxPages" INTEGER NOT NULL,
    "maxCreators" INTEGER,
    "maxReleases" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookletConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" "PodEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodOffering" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPages" INTEGER NOT NULL,
    "maxPages" INTEGER NOT NULL,
    "widthMm" DOUBLE PRECISION,
    "heightMm" DOUBLE PRECISION,
    "pricingMeta" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodOffering_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "FulfillmentState" (
    "countryCode" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'peecho',
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentState_pkey" PRIMARY KEY ("countryCode","stateCode")
);

-- CreateTable
CREATE TABLE "PricingQuoteSnapshot" (
    "id" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "requestedPageCount" INTEGER NOT NULL,
    "shippingAmount" DECIMAL(10,2) NOT NULL,
    "productAmount" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "markupAmount" DECIMAL(10,2),
    "totalEstimate" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "frozenAt" TIMESTAMP(3),
    "quoteMetadataHash" TEXT,
    "quotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingQuoteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedPrintFile" (
    "id" TEXT NOT NULL,
    "collectorProfileId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "storageUrl" TEXT,
    "pageCount" INTEGER,
    "status" "PrintFileStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedPrintFile_pkey" PRIMARY KEY ("id")
);

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
    "peechoOrderId" TEXT,
    "retailTotalAmount" DECIMAL(10,2),
    "wholesaleTotalAmount" DECIMAL(10,2),
    "platformMarkupAmount" DECIMAL(10,2),
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
    "peechoOrderId" TEXT,
    "retailTotalAmount" DECIMAL(10,2),
    "wholesaleTotalAmount" DECIMAL(10,2),
    "platformMarkupAmount" DECIMAL(10,2),
    "creatorPayoutAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL,
    "quoteMarginAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "creatorPayoutSplit" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "platformFeeSplit" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "maxArtworksPerRelease" INTEGER NOT NULL DEFAULT 20,
    "maxReleasesPerCycle" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "CreatorProfileView" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cycleId" TEXT,

    CONSTRAINT "CreatorProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cycleReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lockReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "releaseReminderEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailNotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EmailNotificationType" NOT NULL,
    "cycleId" TEXT,
    "status" "EmailNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "type" "LeadType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "campaign" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "referrerUrl" TEXT,
    "landingPath" TEXT,
    "creatorProfileId" TEXT,
    "ownerUserId" TEXT,
    "notes" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventValue" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionSession" (
    "id" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "leadId" TEXT,
    "firstPath" TEXT NOT NULL,
    "lastPath" TEXT NOT NULL,
    "referrerUrl" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "creatorProfileId" TEXT,
    "entryPageType" "EntryPageType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributionSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_slug_key" ON "CreatorProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_referralCode_key" ON "CreatorProfile"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPayoutProfile_creatorProfileId_key" ON "CreatorPayoutProfile"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorSocialLink_creatorProfileId_label_key" ON "CreatorSocialLink"("creatorProfileId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "CollectorProfile_userId_key" ON "CollectorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseArtwork_releaseId_artworkId_key" ON "ReleaseArtwork"("releaseId", "artworkId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CollectorCreatorSubscription_collectorProfileId_creatorProf_key" ON "CollectorCreatorSubscription"("collectorProfileId", "creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectorReleaseSelection_collectorProfileId_releaseId_cycl_key" ON "CollectorReleaseSelection"("collectorProfileId", "releaseId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionCycle_month_year_key" ON "SubscriptionCycle"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "PodOffering_providerId_externalId_key" ON "PodOffering"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "FulfillmentCountry_region_isActive_idx" ON "FulfillmentCountry"("region", "isActive");

-- CreateIndex
CREATE INDEX "FulfillmentState_countryCode_isActive_idx" ON "FulfillmentState"("countryCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedPrintFile_collectorProfileId_cycleId_key" ON "GeneratedPrintFile"("collectorProfileId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutIntent_collectorProfileId_cycleId_key" ON "CheckoutIntent"("collectorProfileId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingRecord_collectorProfileId_cycleId_key" ON "BillingRecord"("collectorProfileId", "cycleId");

-- CreateIndex
CREATE INDEX "PlatformConfig_updatedAt_idx" ON "PlatformConfig"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentOrder_generatedPrintFileId_key" ON "FulfillmentOrder"("generatedPrintFileId");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentOrder_collectorProfileId_cycleId_key" ON "FulfillmentOrder"("collectorProfileId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutCalculation_cycleId_key" ON "PayoutCalculation"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorPayout_creatorProfileId_cycleId_key" ON "CreatorPayout"("creatorProfileId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_ownerUserId_key" ON "Lead"("ownerUserId");

-- CreateIndex
CREATE INDEX "Lead_type_status_idx" ON "Lead"("type", "status");

-- CreateIndex
CREATE INDEX "Lead_creatorProfileId_idx" ON "Lead"("creatorProfileId");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_eventName_idx" ON "LeadEvent"("leadId", "eventName");

-- CreateIndex
CREATE INDEX "LeadEvent_occurredAt_idx" ON "LeadEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttributionSession_anonymousId_key" ON "AttributionSession"("anonymousId");

-- CreateIndex
CREATE INDEX "AttributionSession_anonymousId_idx" ON "AttributionSession"("anonymousId");

-- CreateIndex
CREATE INDEX "AttributionSession_leadId_idx" ON "AttributionSession"("leadId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorPayoutProfile" ADD CONSTRAINT "CreatorPayoutProfile_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorSocialLink" ADD CONSTRAINT "CreatorSocialLink_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorProfile" ADD CONSTRAINT "CollectorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseArtwork" ADD CONSTRAINT "ReleaseArtwork_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseArtwork" ADD CONSTRAINT "ReleaseArtwork_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseTag" ADD CONSTRAINT "ReleaseTag_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseTag" ADD CONSTRAINT "ReleaseTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorCreatorSubscription" ADD CONSTRAINT "CollectorCreatorSubscription_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorCreatorSubscription" ADD CONSTRAINT "CollectorCreatorSubscription_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorReleaseSelection" ADD CONSTRAINT "CollectorReleaseSelection_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorReleaseSelection" ADD CONSTRAINT "CollectorReleaseSelection_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorReleaseSelection" ADD CONSTRAINT "CollectorReleaseSelection_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodOffering" ADD CONSTRAINT "PodOffering_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "PodProviderConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingQuoteSnapshot" ADD CONSTRAINT "PricingQuoteSnapshot_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingQuoteSnapshot" ADD CONSTRAINT "PricingQuoteSnapshot_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingQuoteSnapshot" ADD CONSTRAINT "PricingQuoteSnapshot_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "PodOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPrintFile" ADD CONSTRAINT "GeneratedPrintFile_collectorProfileId_fkey" FOREIGN KEY ("collectorProfileId") REFERENCES "CollectorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedPrintFile" ADD CONSTRAINT "GeneratedPrintFile_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "CreatorProfileView" ADD CONSTRAINT "CreatorProfileView_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfileView" ADD CONSTRAINT "CreatorProfileView_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotificationLog" ADD CONSTRAINT "EmailNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailNotificationLog" ADD CONSTRAINT "EmailNotificationLog_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "SubscriptionCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionSession" ADD CONSTRAINT "AttributionSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
