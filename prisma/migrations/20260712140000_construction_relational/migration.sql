-- Construction OS relational tables + API key prefix (Phase 6)
-- Apply with: npx prisma migrate deploy

-- CreateTable
CREATE TABLE "ConstructionJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'QC',
    "status" TEXT NOT NULL,
    "contractValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "budgetCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "holdbackPct" INTEGER NOT NULL DEFAULT 10,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "superintendent" TEXT NOT NULL,
    "trades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionLead" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "valueEstimate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionLead_pkey" PRIMARY KEY ("id")
);

-- AlterTable (ApiKey.keyPrefix — skip if column exists on fresh installs via db push)
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "keyPrefix" TEXT NOT NULL DEFAULT 'klir_';

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionJob_companyId_number_key" ON "ConstructionJob"("companyId", "number");
CREATE INDEX "ConstructionJob_companyId_status_idx" ON "ConstructionJob"("companyId", "status");
CREATE INDEX "ConstructionLead_companyId_stage_idx" ON "ConstructionLead"("companyId", "stage");

-- AddForeignKey
ALTER TABLE "ConstructionJob" ADD CONSTRAINT "ConstructionJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionLead" ADD CONSTRAINT "ConstructionLead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
