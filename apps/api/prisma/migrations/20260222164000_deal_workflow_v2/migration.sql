DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationRequestStatus') THEN
    CREATE TYPE "ConversationRequestStatus" AS ENUM ('PENDING', 'ACCEPTED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealPartyRole') THEN
    CREATE TYPE "DealPartyRole" AS ENUM ('LISTING_MANAGER', 'APPLICANT');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractSnapshotFormat') THEN
    CREATE TYPE "ContractSnapshotFormat" AS ENUM ('HTML', 'MARKDOWN');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealContractVersionStatus') THEN
    CREATE TYPE "DealContractVersionStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'VOID');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealEventType') THEN
    CREATE TYPE "DealEventType" AS ENUM (
      'APPLICATION_APPROVED',
      'APPLICATION_REJECTED',
      'CONTRACT_SENT',
      'CONTRACT_VIEWED',
      'SIGNED_BY_MANAGER',
      'SIGNED_BY_APPLICANT',
      'VIEWING_REQUESTED',
      'VIEWING_CONFIRMED',
      'PAYMENT_REQUESTED',
      'PAYMENT_RECEIVED',
      'DEAL_CLOSED',
      'DEAL_CANCELLED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ConversationType' AND e.enumlabel = 'VIEWING_CHAT'
  ) THEN
    ALTER TYPE "ConversationType" ADD VALUE 'VIEWING_CHAT';
  END IF;
END
$$;

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "migratedToV2At" TIMESTAMP(3);

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "viewingId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "applicantUserId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "pairKey" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "requestStatus" "ConversationRequestStatus" NOT NULL DEFAULT 'ACCEPTED';

CREATE TABLE IF NOT EXISTS "DealTermsRent" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "rentAmount" DECIMAL(12,2) NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'USD',
  "depositAmount" DECIMAL(12,2),
  "leaseStartDate" TIMESTAMP(3),
  "leaseEndDate" TIMESTAMP(3),
  "paymentSchedule" TEXT,
  "utilitiesIncluded" JSONB,
  "additionalTerms" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealTermsRent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DealTermsSale" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "salePrice" DECIMAL(12,2) NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'USD',
  "depositAmount" DECIMAL(12,2),
  "closingDate" TIMESTAMP(3),
  "conditions" JSONB,
  "additionalTerms" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealTermsSale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DealSignature" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "role" "DealPartyRole" NOT NULL,
  "signedByUserId" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "signatureData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DealContractVersion" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "versionInt" INTEGER NOT NULL,
  "snapshotFormat" "ContractSnapshotFormat" NOT NULL,
  "snapshotText" TEXT NOT NULL,
  "snapshotHash" TEXT NOT NULL,
  "status" "DealContractVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealContractVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DealEvent" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "type" "DealEventType" NOT NULL,
  "actorUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DealTermsRent_dealId_key" ON "DealTermsRent"("dealId");
CREATE UNIQUE INDEX IF NOT EXISTS "DealTermsSale_dealId_key" ON "DealTermsSale"("dealId");
CREATE UNIQUE INDEX IF NOT EXISTS "DealContractVersion_dealId_versionInt_key" ON "DealContractVersion"("dealId", "versionInt");

CREATE INDEX IF NOT EXISTS "DealSignature_dealId_signedAt_idx" ON "DealSignature"("dealId", "signedAt");
CREATE INDEX IF NOT EXISTS "DealEvent_dealId_createdAt_idx" ON "DealEvent"("dealId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Conversation_viewingId_idx" ON "Conversation"("viewingId");
CREATE INDEX IF NOT EXISTS "Conversation_applicantUserId_idx" ON "Conversation"("applicantUserId");
CREATE INDEX IF NOT EXISTS "Conversation_pairKey_idx" ON "Conversation"("pairKey");

CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_type_propertyId_applicantUserId_key"
  ON "Conversation"("type", "propertyId", "applicantUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_type_viewingId_key"
  ON "Conversation"("type", "viewingId");
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_type_pairKey_key"
  ON "Conversation"("type", "pairKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Conversation_viewingId_fkey'
      AND table_name = 'Conversation'
  ) THEN
    ALTER TABLE "Conversation"
      ADD CONSTRAINT "Conversation_viewingId_fkey"
      FOREIGN KEY ("viewingId") REFERENCES "Viewing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DealTermsRent_dealId_fkey'
      AND table_name = 'DealTermsRent'
  ) THEN
    ALTER TABLE "DealTermsRent"
      ADD CONSTRAINT "DealTermsRent_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DealTermsSale_dealId_fkey'
      AND table_name = 'DealTermsSale'
  ) THEN
    ALTER TABLE "DealTermsSale"
      ADD CONSTRAINT "DealTermsSale_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DealSignature_dealId_fkey'
      AND table_name = 'DealSignature'
  ) THEN
    ALTER TABLE "DealSignature"
      ADD CONSTRAINT "DealSignature_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DealSignature_signedByUserId_fkey'
      AND table_name = 'DealSignature'
  ) THEN
    ALTER TABLE "DealSignature"
      ADD CONSTRAINT "DealSignature_signedByUserId_fkey"
      FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DealContractVersion_dealId_fkey'
      AND table_name = 'DealContractVersion'
  ) THEN
    ALTER TABLE "DealContractVersion"
      ADD CONSTRAINT "DealContractVersion_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DealEvent_dealId_fkey'
      AND table_name = 'DealEvent'
  ) THEN
    ALTER TABLE "DealEvent"
      ADD CONSTRAINT "DealEvent_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'DealEvent_actorUserId_fkey'
      AND table_name = 'DealEvent'
  ) THEN
    ALTER TABLE "DealEvent"
      ADD CONSTRAINT "DealEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
