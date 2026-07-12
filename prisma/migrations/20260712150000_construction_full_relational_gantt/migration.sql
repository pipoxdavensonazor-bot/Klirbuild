-- Construction OS full relational + Task.startDate (Gantt)
CREATE TABLE "ConstructionEstimate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "jobId" TEXT,
    "clientName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tps" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tvq" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "validUntil" TEXT NOT NULL,
    "linesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConstructionEstimate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionChangeOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "submittedAt" TEXT,
    "approvedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConstructionChangeOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionProgressInvoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "completionPct" INTEGER NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "holdback" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConstructionProgressInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionCcqWorker" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "ccqNumber" TEXT NOT NULL,
    "cardExpires" TEXT NOT NULL,
    "hoursThisPeriod" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "apprenticeshipRatioOk" BOOLEAN NOT NULL DEFAULT true,
    "trainingDue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConstructionCcqWorker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionCcqDeclaration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "weekEnding" TEXT NOT NULL,
    "hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConstructionCcqDeclaration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConstructionMarketingCampaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "contracts" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConstructionMarketingCampaign_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "ConstructionEstimate_companyId_number_key" ON "ConstructionEstimate"("companyId", "number");
CREATE INDEX "ConstructionEstimate_companyId_status_idx" ON "ConstructionEstimate"("companyId", "status");
CREATE UNIQUE INDEX "ConstructionChangeOrder_companyId_number_key" ON "ConstructionChangeOrder"("companyId", "number");
CREATE INDEX "ConstructionChangeOrder_companyId_jobId_idx" ON "ConstructionChangeOrder"("companyId", "jobId");
CREATE UNIQUE INDEX "ConstructionProgressInvoice_companyId_number_key" ON "ConstructionProgressInvoice"("companyId", "number");
CREATE INDEX "ConstructionProgressInvoice_companyId_jobId_idx" ON "ConstructionProgressInvoice"("companyId", "jobId");
CREATE INDEX "ConstructionCcqWorker_companyId_idx" ON "ConstructionCcqWorker"("companyId");
CREATE INDEX "ConstructionCcqDeclaration_companyId_weekEnding_idx" ON "ConstructionCcqDeclaration"("companyId", "weekEnding");
CREATE INDEX "ConstructionMarketingCampaign_companyId_status_idx" ON "ConstructionMarketingCampaign"("companyId", "status");

ALTER TABLE "ConstructionEstimate" ADD CONSTRAINT "ConstructionEstimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionChangeOrder" ADD CONSTRAINT "ConstructionChangeOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionProgressInvoice" ADD CONSTRAINT "ConstructionProgressInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionCcqWorker" ADD CONSTRAINT "ConstructionCcqWorker_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionCcqDeclaration" ADD CONSTRAINT "ConstructionCcqDeclaration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConstructionMarketingCampaign" ADD CONSTRAINT "ConstructionMarketingCampaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
