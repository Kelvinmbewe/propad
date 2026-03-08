-- Verification billing V2 schema

CREATE TYPE "VerificationItemWorkflowStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "VerificationPricingKey" AS ENUM (
  'LOCATION_CONFIRMATION_BASE',
  'LOCATION_CONFIRMATION_SITE_VISIT_ADDON',
  'PROPERTY_PHOTOS',
  'PROOF_OF_OWNERSHIP',
  'PROPERTY_VERIFICATION'
);
CREATE TYPE "BillingInvoiceKind" AS ENUM ('VERIFICATION_PRIORITY', 'OTHER');
CREATE TYPE "BillingInvoiceStatus" AS ENUM (
  'DRAFT',
  'ISSUED',
  'PENDING',
  'PAID',
  'CANCELLED',
  'WRITTEN_OFF',
  'REFUNDED'
);
CREATE TYPE "PaymentReceiptMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'MOBILE', 'OTHER');

ALTER TABLE "VerificationRequestItem"
  ADD COLUMN "workflowStatus" "VerificationItemWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "decidedAt" TIMESTAMP(3),
  ADD COLUMN "decidedByUserId" TEXT,
  ADD COLUMN "metadataJson" JSONB,
  ADD COLUMN "siteVisitRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "siteVisitRequestedAt" TIMESTAMP(3);

UPDATE "VerificationRequestItem"
SET "workflowStatus" = CASE
  WHEN "status" = 'SUBMITTED' THEN 'SUBMITTED'::"VerificationItemWorkflowStatus"
  WHEN "status" = 'APPROVED' THEN 'APPROVED'::"VerificationItemWorkflowStatus"
  WHEN "status" = 'REJECTED' THEN 'REJECTED'::"VerificationItemWorkflowStatus"
  ELSE 'DRAFT'::"VerificationItemWorkflowStatus"
END;

UPDATE "VerificationRequestItem"
SET "submittedAt" = COALESCE("submittedAt", "createdAt")
WHERE "status" = 'SUBMITTED';

UPDATE "VerificationRequestItem"
SET
  "decidedAt" = COALESCE("decidedAt", "reviewedAt"),
  "siteVisitRequested" = CASE WHEN COALESCE("notes", '') ILIKE '%on-site visit%' THEN true ELSE false END,
  "siteVisitRequestedAt" = CASE WHEN COALESCE("notes", '') ILIKE '%on-site visit%' THEN COALESCE("reviewedAt", "updatedAt", "createdAt") ELSE NULL END
WHERE "status" IN ('APPROVED', 'REJECTED') OR COALESCE("notes", '') ILIKE '%on-site visit%';

CREATE TABLE "VerificationPricing" (
  "id" TEXT NOT NULL,
  "key" "VerificationPricingKey" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "description" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VerificationPricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerificationPricing_key_key" ON "VerificationPricing"("key");
CREATE INDEX "VerificationPricing_isActive_idx" ON "VerificationPricing"("isActive");

CREATE TABLE "BillingInvoice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "listingId" TEXT,
  "verificationItemId" TEXT,
  "kind" "BillingInvoiceKind" NOT NULL,
  "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "description" TEXT NOT NULL,
  "externalRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "cancelledReason" TEXT,
  "writtenOffAt" TIMESTAMP(3),
  "writtenOffReason" TEXT,

  CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingInvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "pricingKey" "VerificationPricingKey" NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "metaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentReceipt" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "method" "PaymentReceiptMethod" NOT NULL,
  "reference" TEXT,
  "proofFileUrl" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingInvoice_verificationItemId_status_idx" ON "BillingInvoice"("verificationItemId", "status");
CREATE INDEX "BillingInvoice_userId_status_idx" ON "BillingInvoice"("userId", "status");
CREATE INDEX "BillingInvoice_listingId_idx" ON "BillingInvoice"("listingId");
CREATE INDEX "BillingInvoiceLine_invoiceId_idx" ON "BillingInvoiceLine"("invoiceId");
CREATE INDEX "BillingInvoiceLine_pricingKey_idx" ON "BillingInvoiceLine"("pricingKey");
CREATE INDEX "PaymentReceipt_invoiceId_idx" ON "PaymentReceipt"("invoiceId");
CREATE INDEX "VerificationRequestItem_verificationRequestId_type_idx" ON "VerificationRequestItem"("verificationRequestId", "type");

ALTER TABLE "VerificationRequestItem"
  ADD CONSTRAINT "VerificationRequestItem_decidedByUserId_fkey"
  FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VerificationPricing"
  ADD CONSTRAINT "VerificationPricing_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingInvoice"
  ADD CONSTRAINT "BillingInvoice_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingInvoice"
  ADD CONSTRAINT "BillingInvoice_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingInvoice"
  ADD CONSTRAINT "BillingInvoice_verificationItemId_fkey"
  FOREIGN KEY ("verificationItemId") REFERENCES "VerificationRequestItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingInvoiceLine"
  ADD CONSTRAINT "BillingInvoiceLine_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt"
  ADD CONSTRAINT "PaymentReceipt_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "BillingInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt"
  ADD CONSTRAINT "PaymentReceipt_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
