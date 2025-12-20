-- CreateEnum
CREATE TYPE "ListingActivityType" AS ENUM (
  'OFFER_RECEIVED',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'OFFER_CONFIRMED',
  'OFFER_ON_HOLD',
  'AGENT_ASSIGNED',
  'AGENT_UNASSIGNED',
  'PAYMENT_CREATED',
  'PAYMENT_PAID',
  'PAYMENT_FAILED',
  'VERIFICATION_SUBMITTED',
  'VERIFICATION_APPROVED',
  'VERIFICATION_REJECTED',
  'VIEWING_SCHEDULED',
  'VIEWING_ACCEPTED',
  'VIEWING_POSTPONED',
  'VIEWING_CANCELLED',
  'CHAT_MESSAGE',
  'PROPERTY_VIEWED',
  'RATING_SUBMITTED'
);

-- CreateTable
CREATE TABLE "ListingActivityLog" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "ListingActivityType" NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingActivityLog_propertyId_createdAt_idx" ON "ListingActivityLog"("propertyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ListingActivityLog_type_createdAt_idx" ON "ListingActivityLog"("type", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ListingActivityLog" ADD CONSTRAINT "ListingActivityLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingActivityLog" ADD CONSTRAINT "ListingActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

