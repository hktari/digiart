-- AlterTable
ALTER TABLE "CreatorPayoutProfile" ADD COLUMN     "isPayPalVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payPalVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "paypalAccountId" TEXT;
