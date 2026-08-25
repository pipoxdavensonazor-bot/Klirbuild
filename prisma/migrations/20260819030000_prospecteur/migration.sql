-- Prospecteur B2B: scans + entreprises trouvées (emails publiés uniquement)

CREATE TABLE IF NOT EXISTS "ProspectScan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "focus" TEXT NOT NULL DEFAULT 'mix',
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,
    "discovered" INTEGER NOT NULL DEFAULT 0,
    "withEmail" INTEGER NOT NULL DEFAULT 0,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ProspectScan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProspectHit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "email" TEXT,
    "country" TEXT,
    "sector" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "importedLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectHit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProspectScan_companyId_createdAt_idx" ON "ProspectScan"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProspectHit_companyId_createdAt_idx" ON "ProspectHit"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "ProspectHit_companyId_website_idx" ON "ProspectHit"("companyId", "website");
CREATE INDEX IF NOT EXISTS "ProspectHit_scanId_idx" ON "ProspectHit"("scanId");

DO $$ BEGIN
    ALTER TABLE "ProspectScan" ADD CONSTRAINT "ProspectScan_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProspectHit" ADD CONSTRAINT "ProspectHit_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProspectHit" ADD CONSTRAINT "ProspectHit_scanId_fkey"
      FOREIGN KEY ("scanId") REFERENCES "ProspectScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
