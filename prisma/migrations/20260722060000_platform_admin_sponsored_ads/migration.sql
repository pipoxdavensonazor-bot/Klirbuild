-- Platform admin + company suspension + sponsored ads inventory

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "suspended" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_isPlatformAdmin_idx" ON "User"("isPlatformAdmin");

DO $$ BEGIN
  CREATE TYPE "SponsoredAdStatus" AS ENUM ('draft', 'pending_review', 'active', 'paused', 'rejected', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "SponsoredAdCampaign" (
    "id" TEXT NOT NULL,
    "advertiserCompanyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'En savoir plus',
    "ctaUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "surface" TEXT NOT NULL DEFAULT 'dashboard',
    "status" "SponsoredAdStatus" NOT NULL DEFAULT 'draft',
    "dailyBudgetCad" DECIMAL(12,2) NOT NULL DEFAULT 25,
    "totalBudgetCad" DECIMAL(12,2) NOT NULL DEFAULT 250,
    "spentCad" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bidCpmCad" DECIMAL(12,2) NOT NULL DEFAULT 8,
    "bidCpcCad" DECIMAL(12,2) NOT NULL DEFAULT 1.5,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "platformFeePct" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SponsoredAdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SponsoredAdEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "viewerCompanyId" TEXT,
    "viewerEmail" TEXT,
    "type" TEXT NOT NULL,
    "chargedCad" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SponsoredAdEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SponsoredAdCampaign_status_surface_idx" ON "SponsoredAdCampaign"("status", "surface");
CREATE INDEX IF NOT EXISTS "SponsoredAdCampaign_advertiserCompanyId_idx" ON "SponsoredAdCampaign"("advertiserCompanyId");
CREATE INDEX IF NOT EXISTS "SponsoredAdEvent_campaignId_type_idx" ON "SponsoredAdEvent"("campaignId", "type");
CREATE INDEX IF NOT EXISTS "SponsoredAdEvent_createdAt_idx" ON "SponsoredAdEvent"("createdAt");

DO $$ BEGIN
  ALTER TABLE "SponsoredAdCampaign" ADD CONSTRAINT "SponsoredAdCampaign_advertiserCompanyId_fkey"
    FOREIGN KEY ("advertiserCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "SponsoredAdEvent" ADD CONSTRAINT "SponsoredAdEvent_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "SponsoredAdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
