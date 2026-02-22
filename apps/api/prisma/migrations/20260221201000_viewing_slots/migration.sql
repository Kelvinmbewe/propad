DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ViewingSlotStatus') THEN
    CREATE TYPE "ViewingSlotStatus" AS ENUM ('OPEN', 'BOOKED', 'CANCELLED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ViewingSlot" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "status" "ViewingSlotStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "viewingId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViewingSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ViewingSlot_viewingId_key" ON "ViewingSlot"("viewingId");
CREATE UNIQUE INDEX IF NOT EXISTS "ViewingSlot_propertyId_startAt_key" ON "ViewingSlot"("propertyId", "startAt");
CREATE INDEX IF NOT EXISTS "ViewingSlot_propertyId_status_startAt_idx" ON "ViewingSlot"("propertyId", "status", "startAt");
CREATE INDEX IF NOT EXISTS "ViewingSlot_hostId_startAt_idx" ON "ViewingSlot"("hostId", "startAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ViewingSlot_propertyId_fkey'
      AND table_name = 'ViewingSlot'
  ) THEN
    ALTER TABLE "ViewingSlot"
      ADD CONSTRAINT "ViewingSlot_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ViewingSlot_hostId_fkey'
      AND table_name = 'ViewingSlot'
  ) THEN
    ALTER TABLE "ViewingSlot"
      ADD CONSTRAINT "ViewingSlot_hostId_fkey"
      FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ViewingSlot_viewingId_fkey'
      AND table_name = 'ViewingSlot'
  ) THEN
    ALTER TABLE "ViewingSlot"
      ADD CONSTRAINT "ViewingSlot_viewingId_fkey"
      FOREIGN KEY ("viewingId") REFERENCES "Viewing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
