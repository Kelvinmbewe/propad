DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractMethod') THEN
    CREATE TYPE "ContractMethod" AS ENUM ('ESIGN', 'UPLOAD');
  END IF;
END
$$;

ALTER TABLE "Deal"
  ADD COLUMN IF NOT EXISTS "contractMethod" "ContractMethod" NOT NULL DEFAULT 'ESIGN',
  ADD COLUMN IF NOT EXISTS "sealedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sealedMethod" "ContractMethod";

CREATE TABLE IF NOT EXISTS "DealContractFile" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealContractFile_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DealContractFile_dealId_fkey'
  ) THEN
    ALTER TABLE "DealContractFile"
      ADD CONSTRAINT "DealContractFile_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DealContractFile_uploadedByUserId_fkey'
  ) THEN
    ALTER TABLE "DealContractFile"
      ADD CONSTRAINT "DealContractFile_uploadedByUserId_fkey"
      FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "DealContractFile_dealId_createdAt_idx"
  ON "DealContractFile"("dealId", "createdAt");

CREATE INDEX IF NOT EXISTS "DealContractFile_uploadedByUserId_idx"
  ON "DealContractFile"("uploadedByUserId");
