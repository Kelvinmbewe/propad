-- CreateEnum
CREATE TYPE "TrustTier" AS ENUM ('NORMAL', 'WATCH', 'REVIEW', 'HIGH_RISK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "trustTier" "TrustTier" NOT NULL DEFAULT 'NORMAL';
