/*
  Warnings:

  - The values [SHORTLISTED,REVIEWING,CANCELLED] on the enum `ApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [TERMINATED] on the enum `DealStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [VERIFICATION_APPROVAL,DEAL_COMPLETION,AD_REVENUE_SHARE,REFERRAL_BONUS] on the enum `RewardEventType` will be removed. If these variants are still used in the database, this will fail.
  - The values [FINANCE] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The values [REWARD_EARNED,AD_REFUND,DEPOSIT] on the enum `WalletLedgerSourceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `paymentId` on the `Application` table. All the data in the column will be lost.
  - You are about to drop the column `payoutRequestId` on the `Commission` table. All the data in the column will be lost.
  - You are about to drop the column `lastReadAt` on the `ConversationParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `termsJson` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `incentiveSource` on the `RewardDistribution` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `RewardDistribution` table. All the data in the column will be lost.
  - You are about to drop the column `sourceId` on the `RewardDistribution` table. All the data in the column will be lost.
  - You are about to drop the column `sourceType` on the `RewardDistribution` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `severity` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `failedLoginAttempts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lockedUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `referredByCodeId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `GovernanceApproval` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IncentivesManifest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentWebhookEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PayoutExecution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PricingConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PricingConfigVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PromoCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PromoUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PushToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Referral` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReferralCode` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Commission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityId` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entityType` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scoreDelta` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signalType` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdCampaignType" AS ENUM ('PROPERTY_BOOST', 'BANNER', 'SEARCH_SPONSOR');

-- CreateEnum
CREATE TYPE "AgentAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'ACTIVE', 'RESIGNED');

-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FraudReason" AS ENUM ('RAPID_CLICK', 'SELF_CLICK', 'BOT_BEHAVIOR', 'GEO_MISMATCH', 'AGENT_CONFLICT', 'KNOWN_BAD_IP');

-- AlterEnum
BEGIN;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');
ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Application" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING ("status"::text::"ApplicationStatus_new");
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "ApplicationStatus_old";
ALTER TABLE "Application" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- AlterEnum
ALTER TYPE "CommissionStatus" ADD VALUE 'EARNED';

-- AlterEnum
BEGIN;
CREATE TYPE "DealStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "Deal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Deal" ALTER COLUMN "status" TYPE "DealStatus_new" USING ("status"::text::"DealStatus_new");
ALTER TYPE "DealStatus" RENAME TO "DealStatus_old";
ALTER TYPE "DealStatus_new" RENAME TO "DealStatus";
DROP TYPE "DealStatus_old";
ALTER TABLE "Deal" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "ListingPaymentStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VERIFICATION_UPDATE';

-- AlterEnum
ALTER TYPE "PropertyStatus" ADD VALUE 'PUBLISHED';

-- AlterEnum
BEGIN;
CREATE TYPE "RewardEventType_new" AS ENUM ('LISTING_VERIFIED', 'LEAD_VALID', 'SALE_CONFIRMED', 'BONUS_TIER', 'PROMO_REBATE');
ALTER TABLE "RewardDistribution" ALTER COLUMN "sourceType" DROP DEFAULT;
ALTER TABLE "RewardEvent" ALTER COLUMN "type" TYPE "RewardEventType_new" USING ("type"::text::"RewardEventType_new");
ALTER TYPE "RewardEventType" RENAME TO "RewardEventType_old";
ALTER TYPE "RewardEventType_new" RENAME TO "RewardEventType";
DROP TYPE "RewardEventType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'VERIFIER', 'AGENT', 'LANDLORD', 'USER', 'MODERATOR', 'COMPANY_ADMIN', 'COMPANY_AGENT', 'INDEPENDENT_AGENT', 'SELLER', 'TENANT', 'BUYER', 'ADVERTISER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "UserRole" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WalletLedgerSourceType_new" AS ENUM ('VERIFICATION', 'AGENT_COMMISSION', 'COMMISSION_EARNED', 'REFERRAL', 'REWARD', 'PAYOUT', 'ADJUSTMENT', 'AD_SPEND');
ALTER TABLE "WalletLedger" ALTER COLUMN "sourceType" TYPE "WalletLedgerSourceType_new" USING ("sourceType"::text::"WalletLedgerSourceType_new");
ALTER TYPE "WalletLedgerSourceType" RENAME TO "WalletLedgerSourceType_old";
ALTER TYPE "WalletLedgerSourceType_new" RENAME TO "WalletLedgerSourceType";
DROP TYPE "WalletLedgerSourceType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_payoutRequestId_fkey";

-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_userId_fkey";

-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "PayoutExecution" DROP CONSTRAINT "PayoutExecution_payoutRequestId_fkey";

-- DropForeignKey
ALTER TABLE "PromoUsage" DROP CONSTRAINT "PromoUsage_promoCodeId_fkey";

-- DropForeignKey
ALTER TABLE "PromoUsage" DROP CONSTRAINT "PromoUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "PushToken" DROP CONSTRAINT "PushToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_refereeId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralCode" DROP CONSTRAINT "ReferralCode_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "RiskEvent" DROP CONSTRAINT "RiskEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_referredByCodeId_fkey";

-- DropIndex
DROP INDEX "Application_paymentId_key";

-- DropIndex
DROP INDEX "Application_propertyId_idx";

-- DropIndex
DROP INDEX "Application_userId_idx";

-- DropIndex
DROP INDEX "Commission_agentId_idx";

-- DropIndex
DROP INDEX "Commission_status_idx";

-- DropIndex
DROP INDEX "Deal_applicationId_key";

-- DropIndex
DROP INDEX "Notification_userId_readAt_idx";

-- DropIndex
DROP INDEX "RewardDistribution_incentiveSource_idx";

-- DropIndex
DROP INDEX "RewardDistribution_poolId_idx";

-- DropIndex
DROP INDEX "RewardDistribution_sourceType_sourceId_idx";

-- DropIndex
DROP INDEX "RewardDistribution_userId_idx";

-- DropIndex
DROP INDEX "RiskEvent_userId_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- DropIndex
DROP INDEX "VerificationRequest_createdAt_idx";

-- AlterTable
ALTER TABLE "AdCampaign" ADD COLUMN     "budgetCents" INTEGER,
ADD COLUMN     "dailyCapCents" INTEGER,
ADD COLUMN     "spentCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetPropertyId" TEXT,
ADD COLUMN     "type" "AdCampaignType";

-- AlterTable
ALTER TABLE "AdImpression" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Advertiser" ADD COLUMN     "balanceCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "description" TEXT,
ADD COLUMN     "servicesOffered" TEXT,
ADD COLUMN     "shortDescription" TEXT;

-- AlterTable
ALTER TABLE "AgentAssignment" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AgentAssignmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Application" DROP COLUMN "paymentId";

-- AlterTable
ALTER TABLE "Commission" DROP COLUMN "payoutRequestId",
ADD COLUMN     "dealId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'USD',
ALTER COLUMN "ratePercent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "propertyId" DROP NOT NULL,
ALTER COLUMN "lastMessageAt" DROP NOT NULL,
ALTER COLUMN "lastMessageAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ConversationParticipant" DROP COLUMN "lastReadAt",
ADD COLUMN     "leftAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Deal" DROP COLUMN "termsJson",
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "applicationId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "rentAmount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "advertiserId" TEXT;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "updatedAt",
ADD COLUMN     "readAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RewardDistribution" DROP COLUMN "incentiveSource",
DROP COLUMN "metadata",
DROP COLUMN "sourceId",
DROP COLUMN "sourceType";

-- AlterTable
ALTER TABLE "RiskEvent" DROP COLUMN "createdAt",
DROP COLUMN "ipAddress",
DROP COLUMN "metadata",
DROP COLUMN "severity",
DROP COLUMN "type",
DROP COLUMN "userAgent",
DROP COLUMN "userId",
ADD COLUMN     "entityId" TEXT NOT NULL,
ADD COLUMN     "entityType" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "resolvedBy" TEXT,
ADD COLUMN     "scoreDelta" INTEGER NOT NULL,
ADD COLUMN     "signalType" TEXT NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "failedLoginAttempts",
DROP COLUMN "lockedUntil",
DROP COLUMN "referredByCodeId";

-- AlterTable
ALTER TABLE "WalletLedger" ADD COLUMN     "metadata" JSONB;

-- DropTable
DROP TABLE "GovernanceApproval";

-- DropTable
DROP TABLE "IncentivesManifest";

-- DropTable
DROP TABLE "PaymentWebhookEvent";

-- DropTable
DROP TABLE "PayoutExecution";

-- DropTable
DROP TABLE "PricingConfig";

-- DropTable
DROP TABLE "PricingConfigVersion";

-- DropTable
DROP TABLE "PromoCode";

-- DropTable
DROP TABLE "PromoUsage";

-- DropTable
DROP TABLE "PushToken";

-- DropTable
DROP TABLE "Referral";

-- DropTable
DROP TABLE "ReferralCode";

-- DropEnum
DROP TYPE "IncentiveSource";

-- DropEnum
DROP TYPE "ReferralSource";

-- DropEnum
DROP TYPE "ReferralStatus";

-- CreateTable
CREATE TABLE "AdClick" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "flightId" TEXT,
    "placementId" TEXT,
    "userId" TEXT,
    "propertyId" TEXT,
    "sessionId" TEXT NOT NULL,
    "clickUrl" TEXT,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "countryCode" TEXT,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertiserBalanceLog" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvertiserBalanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "severity" "FraudSeverity" NOT NULL,
    "reason" "FraudReason" NOT NULL,
    "score" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "FraudEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdClick_campaignId_createdAt_idx" ON "AdClick"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "AdClick_userId_idx" ON "AdClick"("userId");

-- CreateIndex
CREATE INDEX "AdClick_propertyId_idx" ON "AdClick"("propertyId");

-- CreateIndex
CREATE INDEX "AdClick_sessionId_idx" ON "AdClick"("sessionId");

-- CreateIndex
CREATE INDEX "AdvertiserBalanceLog_advertiserId_createdAt_idx" ON "AdvertiserBalanceLog"("advertiserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdvertiserBalanceLog_reason_idx" ON "AdvertiserBalanceLog"("reason");

-- CreateIndex
CREATE INDEX "FraudEvent_advertiserId_createdAt_idx" ON "FraudEvent"("advertiserId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudEvent_ipAddress_idx" ON "FraudEvent"("ipAddress");

-- CreateIndex
CREATE INDEX "AdCampaign_type_status_idx" ON "AdCampaign"("type", "status");

-- CreateIndex
CREATE INDEX "AdCampaign_targetPropertyId_idx" ON "AdCampaign"("targetPropertyId");

-- CreateIndex
CREATE INDEX "AgentAssignment_agentId_status_idx" ON "AgentAssignment"("agentId", "status");

-- CreateIndex
CREATE INDEX "Application_userId_status_idx" ON "Application"("userId", "status");

-- CreateIndex
CREATE INDEX "Application_propertyId_status_idx" ON "Application"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Commission_agentId_status_idx" ON "Commission"("agentId", "status");

-- CreateIndex
CREATE INDEX "Commission_dealId_idx" ON "Commission"("dealId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "RiskEvent_entityType_entityId_idx" ON "RiskEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "RiskEvent_signalType_idx" ON "RiskEvent"("signalType");

-- CreateIndex
CREATE INDEX "RiskEvent_timestamp_idx" ON "RiskEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "Advertiser" ADD CONSTRAINT "Advertiser_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_targetPropertyId_fkey" FOREIGN KEY ("targetPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertiserBalanceLog" ADD CONSTRAINT "AdvertiserBalanceLog_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudEvent" ADD CONSTRAINT "FraudEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudEvent" ADD CONSTRAINT "FraudEvent_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
