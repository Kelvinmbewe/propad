DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealType') THEN
    CREATE TYPE "DealType" AS ENUM ('RENT', 'SALE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealStage') THEN
    CREATE TYPE "DealStage" AS ENUM (
      'DRAFT',
      'TERMS_SET',
      'CONTRACT_READY',
      'SENT',
      'SIGNING',
      'SIGNED',
      'ACTIVE',
      'CANCELLED'
    );
  END IF;
END
$$;

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "dealType" "DealType";
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "stage" "DealStage" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "rules" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "specialTerms" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "contractTemplateKey" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "contractHtml" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "contractSentAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Deal_stage_idx" ON "Deal"("stage");
CREATE INDEX IF NOT EXISTS "Deal_dealType_idx" ON "Deal"("dealType");
