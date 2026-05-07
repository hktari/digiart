-- Add referralCode to CreatorProfile (unique short code for follower outreach tracking)
ALTER TABLE "CreatorProfile" ADD COLUMN "referralCode" TEXT;
CREATE UNIQUE INDEX "CreatorProfile_referralCode_key" ON "CreatorProfile"("referralCode");

-- Add referralCode to CollectorCreatorSubscription (records which code was used at subscription time)
ALTER TABLE "CollectorCreatorSubscription" ADD COLUMN "referralCode" TEXT;
