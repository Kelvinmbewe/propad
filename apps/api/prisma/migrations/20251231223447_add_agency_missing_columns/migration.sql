/*
  Warnings:

  - The values [SCHEDULED] on the enum `ViewingStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Agency` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYNOW', 'PAYPAL', 'STRIPE');

-- CreateEnum
CREATE TYPE "ChargeableItemType" AS ENUM ('PROPERTY_VERIFICATION', 'AGENT_ASSIGNMENT', 'IN_HOUSE_ADVERT_BUYING', 'IN_HOUSE_ADVERT_SELLING', 'FEATURED_LISTING', 'TRUST_BOOST', 'PREMIUM_VERIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WalletLedgerType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletLedgerSourceType" AS ENUM ('VERIFICATION', 'AGENT_COMMISSION', 'REFERRAL', 'REWARD', 'PAYOUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('NONE', 'BASIC', 'TRUSTED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('PROPERTY', 'USER', 'COMPANY');

-- CreateEnum
CREATE TYPE "SiteVisitStatus" AS ENUM ('PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BoostType" AS ENUM ('LISTING_BOOST', 'FEATURED_LISTING', 'VERIFICATION_FAST_TRACK', 'PROFILE_BOOST');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT', 'WRITE_OFF');

-- AlterEnum
ALTER TYPE "InvoicePurpose" ADD VALUE 'BOOST';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'MODERATOR';
ALTER TYPE "Role" ADD VALUE 'COMPANY_ADMIN';
ALTER TYPE "Role" ADD VALUE 'COMPANY_AGENT';
ALTER TYPE "Role" ADD VALUE 'INDEPENDENT_AGENT';
ALTER TYPE "Role" ADD VALUE 'SELLER';
ALTER TYPE "Role" ADD VALUE 'TENANT';
ALTER TYPE "Role" ADD VALUE 'BUYER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VerificationItemType" ADD VALUE 'COMPANY_REGS';
ALTER TYPE "VerificationItemType" ADD VALUE 'IDENTITY_DOC';
ALTER TYPE "VerificationItemType" ADD VALUE 'PROOF_OF_ADDRESS';
ALTER TYPE "VerificationItemType" ADD VALUE 'SELFIE_VERIFICATION';
ALTER TYPE "VerificationItemType" ADD VALUE 'TAX_CLEARANCE';
ALTER TYPE "VerificationItemType" ADD VALUE 'DIRECTOR_ID';
ALTER TYPE "VerificationItemType" ADD VALUE 'BUSINESS_ADDRESS';

-- AlterEnum
BEGIN;
CREATE TYPE "ViewingStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'POSTPONED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');
ALTER TABLE "Viewing" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Viewing" ALTER COLUMN "status" TYPE "ViewingStatus_new" USING ("status"::text::"ViewingStatus_new");
ALTER TYPE "ViewingStatus" RENAME TO "ViewingStatus_old";
ALTER TYPE "ViewingStatus_new" RENAME TO "ViewingStatus";
DROP TYPE "ViewingStatus_old";
ALTER TABLE "Viewing" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "VerificationRequest" DROP CONSTRAINT "VerificationRequest_propertyId_fkey";

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "verificationScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VerificationRequest" ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "targetId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "targetType" "VerificationType" NOT NULL DEFAULT 'PROPERTY',
ADD COLUMN     "targetUserId" TEXT,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Viewing" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationEvidence" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileHash" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletLedgerType" NOT NULL,
    "sourceType" "WalletLedgerSourceType" NOT NULL,
    "sourceId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletId" TEXT,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyReview" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "verificationItemId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "assignedModeratorId" TEXT,
    "status" "SiteVisitStatus" NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "scheduledAt" TIMESTAMP(3),
    "visitGpsLat" DOUBLE PRECISION,
    "visitGpsLng" DOUBLE PRECISION,
    "distanceFromSubmittedGps" DOUBLE PRECISION,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvent" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedBy" TEXT,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boost" (
    "id" TEXT NOT NULL,
    "type" "BoostType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3) NOT NULL,
    "invoiceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountUsdCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderSettings" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isTestMode" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "returnUrl" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "configJson" JSONB,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "itemType" "ChargeableItemType" NOT NULL,
    "priceUsdCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    "platformFeePercent" DECIMAL(5,2) NOT NULL,
    "agentSharePercent" DECIMAL(5,2),
    "referralSharePercent" DECIMAL(5,2),
    "rewardPoolSharePercent" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPaymentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "bankBranchCode" TEXT,
    "mobileMoneyProvider" TEXT,
    "mobileMoneyNumber" TEXT,
    "paypalEmail" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPaymentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureId" TEXT,
    "featureType" "ChargeableItemType" NOT NULL,
    "invoiceId" TEXT,
    "paymentIntentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayRef" TEXT,
    "transactionRef" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutTransaction" (
    "id" TEXT NOT NULL,
    "payoutRequestId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "gatewayRef" TEXT,
    "receiptUrl" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralEarning" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payoutRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "ReferralEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreateIndex
CREATE INDEX "VerificationEvidence_fileHash_idx" ON "VerificationEvidence"("fileHash");

-- CreateIndex
CREATE INDEX "VerificationEvidence_itemId_idx" ON "VerificationEvidence"("itemId");

-- CreateIndex
CREATE INDEX "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletLedger_userId_type_idx" ON "WalletLedger"("userId", "type");

-- CreateIndex
CREATE INDEX "WalletLedger_sourceType_sourceId_idx" ON "WalletLedger"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "WalletLedger_createdAt_idx" ON "WalletLedger"("createdAt");

-- CreateIndex
CREATE INDEX "AgencyReview_agencyId_idx" ON "AgencyReview"("agencyId");

-- CreateIndex
CREATE INDEX "AgencyReview_reviewerId_idx" ON "AgencyReview"("reviewerId");

-- CreateIndex
CREATE INDEX "SiteVisit_propertyId_idx" ON "SiteVisit"("propertyId");

-- CreateIndex
CREATE INDEX "SiteVisit_assignedModeratorId_idx" ON "SiteVisit"("assignedModeratorId");

-- CreateIndex
CREATE INDEX "SiteVisit_status_idx" ON "SiteVisit"("status");

-- CreateIndex
CREATE INDEX "RiskEvent_entityType_entityId_idx" ON "RiskEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "RiskEvent_signalType_idx" ON "RiskEvent"("signalType");

-- CreateIndex
CREATE INDEX "RiskEvent_timestamp_idx" ON "RiskEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Boost_invoiceId_key" ON "Boost"("invoiceId");

-- CreateIndex
CREATE INDEX "Boost_entityType_entityId_idx" ON "Boost"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Boost_endTime_idx" ON "Boost"("endTime");

-- CreateIndex
CREATE INDEX "LedgerEntry_entityType_entityId_idx" ON "LedgerEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "LedgerEntry_timestamp_idx" ON "LedgerEntry"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderSettings_provider_key" ON "PaymentProviderSettings"("provider");

-- CreateIndex
CREATE INDEX "PaymentProviderSettings_enabled_idx" ON "PaymentProviderSettings"("enabled");

-- CreateIndex
CREATE INDEX "PaymentProviderSettings_isDefault_idx" ON "PaymentProviderSettings"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_itemType_key" ON "PricingRule"("itemType");

-- CreateIndex
CREATE INDEX "PricingRule_itemType_isActive_idx" ON "PricingRule"("itemType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserPaymentProfile_userId_key" ON "UserPaymentProfile"("userId");

-- CreateIndex
CREATE INDEX "UserPaymentProfile_userId_idx" ON "UserPaymentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionRef_key" ON "PaymentTransaction"("transactionRef");

-- CreateIndex
CREATE INDEX "PaymentTransaction_userId_createdAt_idx" ON "PaymentTransaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PaymentTransaction_featureType_featureId_idx" ON "PaymentTransaction"("featureType", "featureId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_gatewayRef_idx" ON "PaymentTransaction"("gatewayRef");

-- CreateIndex
CREATE INDEX "PaymentTransaction_transactionRef_idx" ON "PaymentTransaction"("transactionRef");

-- CreateIndex
CREATE INDEX "PayoutTransaction_payoutRequestId_idx" ON "PayoutTransaction"("payoutRequestId");

-- CreateIndex
CREATE INDEX "PayoutTransaction_status_idx" ON "PayoutTransaction"("status");

-- CreateIndex
CREATE INDEX "PayoutTransaction_gatewayRef_idx" ON "PayoutTransaction"("gatewayRef");

-- CreateIndex
CREATE INDEX "ReferralEarning_referrerId_createdAt_idx" ON "ReferralEarning"("referrerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReferralEarning_status_idx" ON "ReferralEarning"("status");

-- CreateIndex
CREATE INDEX "ReferralEarning_sourceType_sourceId_idx" ON "ReferralEarning"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_slug_key" ON "Agency"("slug");

-- CreateIndex
CREATE INDEX "VerificationRequest_targetType_targetId_idx" ON "VerificationRequest"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMember" ADD CONSTRAINT "AgencyMember_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationEvidence" ADD CONSTRAINT "VerificationEvidence_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VerificationRequestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyReview" ADD CONSTRAINT "AgencyReview_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyReview" ADD CONSTRAINT "AgencyReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_assignedModeratorId_fkey" FOREIGN KEY ("assignedModeratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_verificationItemId_fkey" FOREIGN KEY ("verificationItemId") REFERENCES "VerificationRequestItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boost" ADD CONSTRAINT "Boost_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPaymentProfile" ADD CONSTRAINT "UserPaymentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "PayoutRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "PayoutRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
