/*
  Warnings:

  - The `status` column on the `Interest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `PaymentTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `createdByRole` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `SiteVisit` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `trustTier` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Verification` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `VerificationRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `VerificationRequestItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Viewing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `ListingPayment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `provider` on the `PaymentProviderSettings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `featureType` on the `PaymentTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `itemType` on the `PricingRule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `PropertyRating` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PayoutMethod" ADD VALUE 'ONEMONEY';
ALTER TYPE "PayoutMethod" ADD VALUE 'BANK_TRANSFER';
ALTER TYPE "PayoutMethod" ADD VALUE 'ZIPIT';
ALTER TYPE "PayoutMethod" ADD VALUE 'CASH';
ALTER TYPE "PayoutMethod" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Interest" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ListingPayment" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentProviderSettings" DROP COLUMN "provider",
ADD COLUMN     "provider" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PaymentTransaction" DROP COLUMN "featureType",
ADD COLUMN     "featureType" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PricingRule" DROP COLUMN "itemType",
ADD COLUMN     "itemType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "createdByRole",
ADD COLUMN     "createdByRole" TEXT NOT NULL DEFAULT 'LANDLORD';

-- AlterTable
ALTER TABLE "PropertyRating" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SiteVisit" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING_ASSIGNMENT';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "trustTier",
ADD COLUMN     "trustTier" TEXT NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "Verification" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "VerificationRequest" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "VerificationRequestItem" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Viewing" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "ChargeableItemType";

-- DropEnum
DROP TYPE "InterestStatus";

-- DropEnum
DROP TYPE "ListingCreatorRole";

-- DropEnum
DROP TYPE "ListingPaymentType";

-- DropEnum
DROP TYPE "PaymentProvider";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "PropertyRatingType";

-- DropEnum
DROP TYPE "SiteVisitStatus";

-- DropEnum
DROP TYPE "TrustTier";

-- DropEnum
DROP TYPE "VerificationItemStatus";

-- DropEnum
DROP TYPE "VerificationStatus";

-- DropEnum
DROP TYPE "ViewingStatus";

-- CreateIndex
CREATE INDEX "ListingPayment_type_idx" ON "ListingPayment"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderSettings_provider_key" ON "PaymentProviderSettings"("provider");

-- CreateIndex
CREATE INDEX "PaymentTransaction_featureType_featureId_idx" ON "PaymentTransaction"("featureType", "featureId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_itemType_key" ON "PricingRule"("itemType");

-- CreateIndex
CREATE INDEX "PricingRule_itemType_isActive_idx" ON "PricingRule"("itemType", "isActive");

-- CreateIndex
CREATE INDEX "PropertyRating_type_weight_idx" ON "PropertyRating"("type", "weight");

-- CreateIndex
CREATE INDEX "SiteVisit_status_idx" ON "SiteVisit"("status");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE INDEX "VerificationRequestItem_type_status_idx" ON "VerificationRequestItem"("type", "status");
