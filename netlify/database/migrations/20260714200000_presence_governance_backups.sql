-- Admin: delete requests + company backups
CREATE TABLE IF NOT EXISTS "DeleteRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "resourceLabel" TEXT,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requestedByEmail" TEXT NOT NULL,
  "requestedByName" TEXT,
  "reviewedByEmail" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeleteRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DeleteRequest_companyId_status_createdAt_idx"
  ON "DeleteRequest"("companyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "DeleteRequest_companyId_resourceType_resourceId_idx"
  ON "DeleteRequest"("companyId", "resourceType", "resourceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DeleteRequest_companyId_fkey') THEN
    ALTER TABLE "DeleteRequest"
      ADD CONSTRAINT "DeleteRequest_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CompanyBackup" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "storageKey" TEXT,
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "trigger" TEXT NOT NULL DEFAULT 'auto',
  "createdByEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyBackup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CompanyBackup_companyId_createdAt_idx"
  ON "CompanyBackup"("companyId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanyBackup_companyId_fkey') THEN
    ALTER TABLE "CompanyBackup"
      ADD CONSTRAINT "CompanyBackup_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
