-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'CLICK', 'HOVER', 'CONVERSION', 'VIDEO_START', 'VIDEO_COMPLETE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADVERTISER';

-- AlterTable
ALTER TABLE "AdCampaign" ADD COLUMN     "rewardPoolId" TEXT;

-- AlterTable
ALTER TABLE "WalletLedger" ADD COLUMN     "rewardDistributionId" TEXT;

-- CreateTable
CREATE TABLE "RewardPool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalUsdCents" INTEGER NOT NULL DEFAULT 0,
    "spentUsdCents" INTEGER NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardDistribution" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "AdEventType" NOT NULL,
    "metadata" JSONB,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdEvent_campaignId_type_createdAt_idx" ON "AdEvent"("campaignId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AdEvent_userId_type_idx" ON "AdEvent"("userId", "type");

-- CreateIndex
CREATE INDEX "AdEvent_sessionId_idx" ON "AdEvent"("sessionId");

-- AddForeignKey
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_rewardDistributionId_fkey" FOREIGN KEY ("rewardDistributionId") REFERENCES "RewardDistribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_rewardPoolId_fkey" FOREIGN KEY ("rewardPoolId") REFERENCES "RewardPool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDistribution" ADD CONSTRAINT "RewardDistribution_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "RewardPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "AdFlight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "AdPlacement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "AdCreative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
