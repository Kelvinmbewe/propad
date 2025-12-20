-- CreateEnum
CREATE TYPE "PropertyRatingType" AS ENUM ('PREVIOUS_TENANT', 'CURRENT_TENANT', 'VISITOR', 'ANONYMOUS');

-- CreateTable
CREATE TABLE "PropertyRating" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "rating" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "comment" TEXT,
    "type" "PropertyRatingType" NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "tenantMonths" INTEGER,
    "isVerifiedTenant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyRating_propertyId_reviewerId_key" ON "PropertyRating"("propertyId", "reviewerId");

-- CreateIndex
CREATE INDEX "PropertyRating_propertyId_createdAt_idx" ON "PropertyRating"("propertyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PropertyRating_reviewerId_idx" ON "PropertyRating"("reviewerId");

-- CreateIndex
CREATE INDEX "PropertyRating_type_weight_idx" ON "PropertyRating"("type", "weight");

-- AddForeignKey
ALTER TABLE "PropertyRating" ADD CONSTRAINT "PropertyRating_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRating" ADD CONSTRAINT "PropertyRating_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

