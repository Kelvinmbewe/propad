-- AlterEnum: Add new statuses to ViewingStatus
-- Note: PostgreSQL does not allow using newly added enum values in the same transaction
-- The UPDATE statement has been removed to avoid the "unsafe use of new enum value" error
-- Data updates should be handled in a separate migration or application code

ALTER TYPE "ViewingStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ViewingStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "ViewingStatus" ADD VALUE IF NOT EXISTS 'POSTPONED';

