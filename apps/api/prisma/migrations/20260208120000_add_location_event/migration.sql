-- Create enum
CREATE TYPE "LocationEventType" AS ENUM ('SEARCH', 'VIEW_LISTING', 'VIEW_AGENT', 'VIEW_AGENCY');

-- Create table
CREATE TABLE "LocationEvent" (
  "id" TEXT NOT NULL,
  "type" "LocationEventType" NOT NULL,
  "locationId" TEXT,
  "listingId" TEXT,
  "userId" TEXT,
  "agentId" TEXT,
  "agencyId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LocationEvent_type_createdAt_idx" ON "LocationEvent"("type", "createdAt" DESC);
CREATE INDEX "LocationEvent_locationId_createdAt_idx" ON "LocationEvent"("locationId", "createdAt" DESC);
CREATE INDEX "LocationEvent_listingId_createdAt_idx" ON "LocationEvent"("listingId", "createdAt" DESC);
CREATE INDEX "LocationEvent_agentId_createdAt_idx" ON "LocationEvent"("agentId", "createdAt" DESC);
CREATE INDEX "LocationEvent_agencyId_createdAt_idx" ON "LocationEvent"("agencyId", "createdAt" DESC);
CREATE INDEX "LocationEvent_userId_createdAt_idx" ON "LocationEvent"("userId", "createdAt" DESC);
