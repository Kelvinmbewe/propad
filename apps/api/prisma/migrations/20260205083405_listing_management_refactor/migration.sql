-- CreateEnum
CREATE TYPE "ListingManagedByType" AS ENUM ('OWNER', 'AGENT', 'AGENCY');

-- CreateEnum
CREATE TYPE "ListingManagementStatus" AS ENUM ('CREATED', 'ACCEPTED', 'DECLINED', 'ENDED');

-- CreateEnum
CREATE TYPE "InterestPipelineStatus" AS ENUM ('NEW', 'CONTACTED', 'VIEWING_SCHEDULED', 'OFFER_RECEIVED', 'ACCEPTED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ViewingRequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MessageModerationStatus" AS ENUM ('OK', 'FLAGGED', 'BLOCKED');

-- AlterTable
ALTER TABLE "Interest" ADD COLUMN     "pipelineStatus" "InterestPipelineStatus" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "containsContactInfo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationNotes" TEXT,
ADD COLUMN     "moderationStatus" "MessageModerationStatus" NOT NULL DEFAULT 'OK';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "assignedAgentId" TEXT,
ADD COLUMN     "managedById" TEXT,
ADD COLUMN     "managedByType" "ListingManagedByType" NOT NULL DEFAULT 'OWNER',
ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "PropertyMessage" ADD COLUMN     "containsContactInfo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationNotes" TEXT,
ADD COLUMN     "moderationStatus" "MessageModerationStatus" NOT NULL DEFAULT 'OK';

-- AlterTable
ALTER TABLE "Viewing" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "hostConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "requestedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rescheduledAt" TIMESTAMP(3),
ADD COLUMN     "statusV2" "ViewingRequestStatus" NOT NULL DEFAULT 'REQUESTED',
ADD COLUMN     "viewerConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ListingManagementAssignment" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "managedByType" "ListingManagedByType" NOT NULL,
    "managedById" TEXT,
    "assignedAgentId" TEXT,
    "serviceFeeUsdCents" INTEGER,
    "landlordPaysFee" BOOLEAN NOT NULL DEFAULT true,
    "status" "ListingManagementStatus" NOT NULL DEFAULT 'CREATED',
    "createdById" TEXT,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingManagementAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingManagementAssignment_propertyId_createdAt_idx" ON "ListingManagementAssignment"("propertyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ListingManagementAssignment_ownerId_status_idx" ON "ListingManagementAssignment"("ownerId", "status");

-- CreateIndex
CREATE INDEX "ListingManagementAssignment_assignedAgentId_status_idx" ON "ListingManagementAssignment"("assignedAgentId", "status");

-- CreateIndex
CREATE INDEX "ListingManagementAssignment_managedByType_managedById_idx" ON "ListingManagementAssignment"("managedByType", "managedById");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingManagementAssignment" ADD CONSTRAINT "ListingManagementAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingManagementAssignment" ADD CONSTRAINT "ListingManagementAssignment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingManagementAssignment" ADD CONSTRAINT "ListingManagementAssignment_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingManagementAssignment" ADD CONSTRAINT "ListingManagementAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingManagementAssignment" ADD CONSTRAINT "ListingManagementAssignment_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMessage" ADD CONSTRAINT "PropertyMessage_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
