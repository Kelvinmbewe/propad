-- CreateEnum
CREATE TYPE "ListingCreatorRole" AS ENUM ('LANDLORD', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ViewingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "FeaturedListingStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING_PAYMENT');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "Verification" DROP CONSTRAINT "Verification_propertyId_fkey";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "createdByRole" "ListingCreatorRole" NOT NULL DEFAULT 'LANDLORD';

-- AlterTable
ALTER TABLE "UserReview" ADD COLUMN     "propertyId" TEXT;

-- AlterTable
ALTER TABLE "Verification" ADD COLUMN     "requesterId" TEXT,
ADD COLUMN     "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "targetId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "targetType" TEXT NOT NULL DEFAULT 'property',
ALTER COLUMN "propertyId" DROP NOT NULL,
ALTER COLUMN "method" SET DEFAULT 'DOCS',
ALTER COLUMN "result" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Viewing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "agentId" TEXT,
    "landlordId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ViewingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viewing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedListing" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,
    "priorityLevel" INTEGER NOT NULL DEFAULT 1,
    "status" "FeaturedListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Viewing_propertyId_scheduledAt_idx" ON "Viewing"("propertyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Viewing_viewerId_idx" ON "Viewing"("viewerId");

-- CreateIndex
CREATE INDEX "Viewing_agentId_idx" ON "Viewing"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedListing_listingId_key" ON "FeaturedListing"("listingId");

-- CreateIndex
CREATE INDEX "UserReview_propertyId_idx" ON "UserReview"("propertyId");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReview" ADD CONSTRAINT "UserReview_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viewing" ADD CONSTRAINT "Viewing_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedListing" ADD CONSTRAINT "FeaturedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
