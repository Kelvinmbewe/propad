-- CreateEnum
CREATE TYPE "AffiliationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IDENTITY', 'PROOF_ADDRESS', 'CERTIFICATE', 'TAX', 'UBO', 'OTHER');

-- CreateTable
CREATE TABLE "UserKyc" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserKycIdentity" (
    "id" TEXT NOT NULL,
    "userKycId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "idNumber" TEXT,
    "idType" "KycIdType" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "addressLine1" TEXT,
    "addressCity" TEXT,
    "addressProvince" TEXT,
    "addressCountry" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKycIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompanyAffiliation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "roleTitle" TEXT,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCompanyAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "shortDescription" TEXT,
    "description" TEXT,
    "servicesJson" JSONB,
    "areasServedJson" JSONB,
    "hoursJson" JSONB,
    "languagesJson" JSONB,
    "socialLinksJson" JSONB,
    "responseTimeMinutes" INTEGER,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "trustBreakdownJson" JSONB,
    "listingsCount" INTEGER NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verifiedTransactionsCount" INTEGER NOT NULL DEFAULT 0,
    "complaintResolutionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearsActive" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyKyc" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3),
    "riskFlagsJson" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyKyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyKycIdentity" (
    "id" TEXT NOT NULL,
    "companyKycId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxNumber" TEXT,
    "addressLine1" TEXT,
    "addressCity" TEXT,
    "addressProvince" TEXT,
    "addressCountry" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyKycIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyKycUbo" (
    "id" TEXT NOT NULL,
    "companyKycId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "ownershipPct" DOUBLE PRECISION,
    "dateOfBirth" TIMESTAMP(3),
    "addressLine1" TEXT,
    "addressCity" TEXT,
    "addressProvince" TEXT,
    "addressCountry" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyKycUbo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "companyKycId" TEXT,
    "userKycId" TEXT,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "storagePath" TEXT NOT NULL,
    "fileHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "extractedFields" JSONB,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserKyc_userId_key" ON "UserKyc"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserKycIdentity_userKycId_key" ON "UserKycIdentity"("userKycId");

-- CreateIndex
CREATE INDEX "UserCompanyAffiliation_userId_status_idx" ON "UserCompanyAffiliation"("userId", "status");

-- CreateIndex
CREATE INDEX "UserCompanyAffiliation_agencyId_status_idx" ON "UserCompanyAffiliation"("agencyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Company_agencyId_key" ON "Company"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyKyc_companyId_key" ON "CompanyKyc"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyKycIdentity_companyKycId_key" ON "CompanyKycIdentity"("companyKycId");

-- CreateIndex
CREATE INDEX "CompanyKycUbo_companyKycId_idx" ON "CompanyKycUbo"("companyKycId");

-- CreateIndex
CREATE INDEX "Document_companyId_status_idx" ON "Document"("companyId", "status");

-- CreateIndex
CREATE INDEX "Document_userId_status_idx" ON "Document"("userId", "status");

-- CreateIndex
CREATE INDEX "Document_companyKycId_idx" ON "Document"("companyKycId");

-- CreateIndex
CREATE INDEX "Document_userKycId_idx" ON "Document"("userKycId");

-- AddForeignKey
ALTER TABLE "UserKyc" ADD CONSTRAINT "UserKyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKyc" ADD CONSTRAINT "UserKyc_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserKycIdentity" ADD CONSTRAINT "UserKycIdentity_userKycId_fkey" FOREIGN KEY ("userKycId") REFERENCES "UserKyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyAffiliation" ADD CONSTRAINT "UserCompanyAffiliation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyAffiliation" ADD CONSTRAINT "UserCompanyAffiliation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompanyAffiliation" ADD CONSTRAINT "UserCompanyAffiliation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyKyc" ADD CONSTRAINT "CompanyKyc_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyKyc" ADD CONSTRAINT "CompanyKyc_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyKycIdentity" ADD CONSTRAINT "CompanyKycIdentity_companyKycId_fkey" FOREIGN KEY ("companyKycId") REFERENCES "CompanyKyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyKycUbo" ADD CONSTRAINT "CompanyKycUbo_companyKycId_fkey" FOREIGN KEY ("companyKycId") REFERENCES "CompanyKyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyKycId_fkey" FOREIGN KEY ("companyKycId") REFERENCES "CompanyKyc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userKycId_fkey" FOREIGN KEY ("userKycId") REFERENCES "UserKyc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
