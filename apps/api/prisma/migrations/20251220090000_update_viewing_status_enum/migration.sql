-- AlterEnum: Add new statuses to ViewingStatus
ALTER TYPE "ViewingStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ViewingStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "ViewingStatus" ADD VALUE IF NOT EXISTS 'POSTPONED';

-- Update existing SCHEDULED viewings to PENDING
UPDATE "Viewing" SET "status" = 'PENDING' WHERE "status" = 'SCHEDULED';

