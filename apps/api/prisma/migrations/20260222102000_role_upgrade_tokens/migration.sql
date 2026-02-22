CREATE TABLE IF NOT EXISTS "RoleUpgradeToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "targetRole" "Role" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "usedByUserId" TEXT,
  "issuedById" TEXT,
  "note" TEXT,
  "campaign" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleUpgradeToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoleUpgradeToken_tokenHash_key" ON "RoleUpgradeToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RoleUpgradeToken_targetRole_expiresAt_idx" ON "RoleUpgradeToken"("targetRole", "expiresAt");
CREATE INDEX IF NOT EXISTS "RoleUpgradeToken_usedByUserId_idx" ON "RoleUpgradeToken"("usedByUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'RoleUpgradeToken_usedByUserId_fkey'
      AND table_name = 'RoleUpgradeToken'
  ) THEN
    ALTER TABLE "RoleUpgradeToken"
      ADD CONSTRAINT "RoleUpgradeToken_usedByUserId_fkey"
      FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
