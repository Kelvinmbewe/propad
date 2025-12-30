-- AlterTable
ALTER TABLE "AgencyMember" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "AgencyMember" ADD COLUMN "assignedById" TEXT;
