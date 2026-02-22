/*
  Warnings:

  - Added the required column `userId` to the `RewardDistribution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RewardDistribution" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AdSenseSync" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdSenseSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSenseDailyStat" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "revenueMicros" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSenseDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdSenseSync_date_key" ON "AdSenseSync"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdSenseDailyStat_date_key" ON "AdSenseDailyStat"("date");

-- AddForeignKey
ALTER TABLE "RewardDistribution" ADD CONSTRAINT "RewardDistribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
