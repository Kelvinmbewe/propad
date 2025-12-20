-- CreateEnum
CREATE TYPE "ListingPaymentType" AS ENUM ('AGENT_FEE', 'FEATURED', 'VERIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "ListingPayment" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "ListingPaymentType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "ListingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "invoiceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPayment_propertyId_createdAt_idx" ON "ListingPayment"("propertyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ListingPayment_status_idx" ON "ListingPayment"("status");

-- CreateIndex
CREATE INDEX "ListingPayment_type_idx" ON "ListingPayment"("type");

-- AddForeignKey
ALTER TABLE "ListingPayment" ADD CONSTRAINT "ListingPayment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPayment" ADD CONSTRAINT "ListingPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

