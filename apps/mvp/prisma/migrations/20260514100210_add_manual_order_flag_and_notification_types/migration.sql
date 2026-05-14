-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailNotificationType" ADD VALUE 'COLLECTOR_AUTO_LOCK_REMINDER';
ALTER TYPE "EmailNotificationType" ADD VALUE 'COLLECTOR_ORDER_CONFIRMED';
ALTER TYPE "EmailNotificationType" ADD VALUE 'COLLECTOR_BOOKLET_SHIPPED';

-- AlterTable
ALTER TABLE "CheckoutIntent" ADD COLUMN     "orderedAt" TIMESTAMP(3),
ADD COLUMN     "orderedManually" BOOLEAN NOT NULL DEFAULT false;
