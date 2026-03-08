DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeaseStatus') THEN
    CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'TERMINATED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RatingTargetType') THEN
    CREATE TYPE "RatingTargetType" AS ENUM ('LISTING', 'USER', 'COMPANY');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RatingContext') THEN
    CREATE TYPE "RatingContext" AS ENUM ('RENTAL', 'SALE', 'VIEWING', 'GENERAL');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentPaymentMethod') THEN
    CREATE TYPE "RentPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'OTHER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentPaymentRecordStatus') THEN
    CREATE TYPE "RentPaymentRecordStatus" AS ENUM ('PENDING', 'PAID', 'LATE', 'FAILED', 'CANCELLED');
  END IF;
END
$$;

ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "leaseId" TEXT;
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "landlordId" TEXT;
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "method" "RentPaymentMethod" NOT NULL DEFAULT 'CASH';
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "status" "RentPaymentRecordStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3);
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3);
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "RentPayment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RentPayment" ALTER COLUMN "paidAt" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "Lease" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "landlordId" TEXT NOT NULL,
  "companyId" TEXT,
  "dealId" TEXT,
  "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "terminationReason" TEXT,
  "currency" "Currency" NOT NULL DEFAULT 'USD',
  "rentAmount" DECIMAL(12,2),
  "depositAmount" DECIMAL(12,2),
  "billingDay" INTEGER,
  "payToAccount" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Rating" (
  "id" TEXT NOT NULL,
  "context" "RatingContext" NOT NULL DEFAULT 'RENTAL',
  "targetType" "RatingTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "leaseId" TEXT,
  "propertyId" TEXT,
  "raterId" TEXT NOT NULL,
  "ratedUserId" TEXT,
  "ratedCompanyId" TEXT,
  "score" INTEGER NOT NULL,
  "comment" TEXT,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Lease_dealId_key" ON "Lease"("dealId");
CREATE INDEX IF NOT EXISTS "Lease_propertyId_idx" ON "Lease"("propertyId");
CREATE INDEX IF NOT EXISTS "Lease_tenantId_idx" ON "Lease"("tenantId");
CREATE INDEX IF NOT EXISTS "Lease_landlordId_idx" ON "Lease"("landlordId");
CREATE INDEX IF NOT EXISTS "Lease_companyId_idx" ON "Lease"("companyId");
CREATE INDEX IF NOT EXISTS "Lease_status_idx" ON "Lease"("status");

CREATE INDEX IF NOT EXISTS "Rating_targetType_targetId_idx" ON "Rating"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "Rating_leaseId_idx" ON "Rating"("leaseId");
CREATE INDEX IF NOT EXISTS "Rating_propertyId_idx" ON "Rating"("propertyId");
CREATE INDEX IF NOT EXISTS "Rating_raterId_idx" ON "Rating"("raterId");
CREATE INDEX IF NOT EXISTS "Rating_ratedUserId_idx" ON "Rating"("ratedUserId");
CREATE INDEX IF NOT EXISTS "Rating_ratedCompanyId_idx" ON "Rating"("ratedCompanyId");
CREATE UNIQUE INDEX IF NOT EXISTS "Rating_leaseId_raterId_targetType_targetId_key"
  ON "Rating"("leaseId", "raterId", "targetType", "targetId");

CREATE INDEX IF NOT EXISTS "RentPayment_leaseId_idx" ON "RentPayment"("leaseId");
CREATE INDEX IF NOT EXISTS "RentPayment_landlordId_idx" ON "RentPayment"("landlordId");
CREATE INDEX IF NOT EXISTS "RentPayment_status_idx" ON "RentPayment"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lease_propertyId_fkey' AND table_name = 'Lease'
  ) THEN
    ALTER TABLE "Lease"
      ADD CONSTRAINT "Lease_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lease_tenantId_fkey' AND table_name = 'Lease'
  ) THEN
    ALTER TABLE "Lease"
      ADD CONSTRAINT "Lease_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lease_landlordId_fkey' AND table_name = 'Lease'
  ) THEN
    ALTER TABLE "Lease"
      ADD CONSTRAINT "Lease_landlordId_fkey"
      FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lease_companyId_fkey' AND table_name = 'Lease'
  ) THEN
    ALTER TABLE "Lease"
      ADD CONSTRAINT "Lease_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Lease_dealId_fkey' AND table_name = 'Lease'
  ) THEN
    ALTER TABLE "Lease"
      ADD CONSTRAINT "Lease_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Rating_leaseId_fkey' AND table_name = 'Rating'
  ) THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_leaseId_fkey"
      FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Rating_propertyId_fkey' AND table_name = 'Rating'
  ) THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_propertyId_fkey"
      FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Rating_raterId_fkey' AND table_name = 'Rating'
  ) THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_raterId_fkey"
      FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Rating_ratedUserId_fkey' AND table_name = 'Rating'
  ) THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_ratedUserId_fkey"
      FOREIGN KEY ("ratedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Rating_ratedCompanyId_fkey' AND table_name = 'Rating'
  ) THEN
    ALTER TABLE "Rating"
      ADD CONSTRAINT "Rating_ratedCompanyId_fkey"
      FOREIGN KEY ("ratedCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'RentPayment_leaseId_fkey' AND table_name = 'RentPayment'
  ) THEN
    ALTER TABLE "RentPayment"
      ADD CONSTRAINT "RentPayment_leaseId_fkey"
      FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'RentPayment_landlordId_fkey' AND table_name = 'RentPayment'
  ) THEN
    ALTER TABLE "RentPayment"
      ADD CONSTRAINT "RentPayment_landlordId_fkey"
      FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
