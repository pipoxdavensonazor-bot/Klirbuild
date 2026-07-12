import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  ConstructionJob,
  ConstructionLead,
  JobStatus,
} from "@/modules/construction-os/types";

function decimal(n: number) {
  return new Prisma.Decimal(n);
}

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber();
}

export function jobFromRow(row: {
  id: string;
  number: string;
  name: string;
  clientName: string;
  address: string;
  city: string;
  province: string;
  status: string;
  contractValue: Prisma.Decimal;
  budgetCost: Prisma.Decimal;
  actualCost: Prisma.Decimal;
  progressPct: number;
  holdbackPct: number;
  startDate: string;
  endDate: string | null;
  superintendent: string;
  trades: string[];
}): ConstructionJob {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    clientName: row.clientName,
    address: row.address,
    city: row.city,
    province: row.province as ConstructionJob["province"],
    status: row.status as JobStatus,
    contractValue: toNumber(row.contractValue),
    budgetCost: toNumber(row.budgetCost),
    actualCost: toNumber(row.actualCost),
    progressPct: row.progressPct,
    holdbackPct: row.holdbackPct,
    startDate: row.startDate,
    endDate: row.endDate ?? undefined,
    superintendent: row.superintendent,
    trades: row.trades as ConstructionJob["trades"],
  };
}

export function leadFromRow(row: {
  id: string;
  name: string;
  source: string;
  projectType: string;
  valueEstimate: Prisma.Decimal;
  stage: string;
  owner: string;
  city: string;
}): ConstructionLead {
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    projectType: row.projectType,
    valueEstimate: toNumber(row.valueEstimate),
    stage: row.stage as ConstructionLead["stage"],
    owner: row.owner,
    city: row.city,
  };
}

function jobToCreate(companyId: string, job: ConstructionJob) {
  return {
    id: job.id,
    companyId,
    number: job.number,
    name: job.name,
    clientName: job.clientName,
    address: job.address,
    city: job.city,
    province: job.province,
    status: job.status,
    contractValue: decimal(job.contractValue),
    budgetCost: decimal(job.budgetCost),
    actualCost: decimal(job.actualCost),
    progressPct: job.progressPct,
    holdbackPct: job.holdbackPct,
    startDate: job.startDate,
    endDate: job.endDate ?? null,
    superintendent: job.superintendent,
    trades: [...job.trades],
  };
}

function leadToCreate(companyId: string, lead: ConstructionLead) {
  return {
    id: lead.id,
    companyId,
    name: lead.name,
    source: lead.source,
    projectType: lead.projectType,
    valueEstimate: decimal(lead.valueEstimate),
    stage: lead.stage,
    owner: lead.owner,
    city: lead.city,
  };
}

export async function listConstructionJobs(companyId: string) {
  const rows = await prisma.constructionJob.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(jobFromRow);
}

export async function listConstructionLeads(companyId: string) {
  const rows = await prisma.constructionLead.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(leadFromRow);
}

export async function upsertConstructionJob(
  companyId: string,
  input: { id?: string; data: Partial<ConstructionJob> }
) {
  const existing = input.id
    ? await prisma.constructionJob.findFirst({
        where: { id: input.id, companyId },
      })
    : null;

  if (input.id && !existing) {
    return { error: "Élément introuvable." as const };
  }

  const base = existing ? jobFromRow(existing) : null;
  const merged: ConstructionJob = {
    id: input.id ?? `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    number: input.data.number ?? base?.number ?? `CH-${Date.now()}`,
    name: input.data.name ?? base?.name ?? "Nouveau chantier",
    clientName: input.data.clientName ?? base?.clientName ?? "",
    address: input.data.address ?? base?.address ?? "",
    city: input.data.city ?? base?.city ?? "",
    province: input.data.province ?? base?.province ?? "QC",
    status: input.data.status ?? base?.status ?? "estimating",
    contractValue: input.data.contractValue ?? base?.contractValue ?? 0,
    budgetCost: input.data.budgetCost ?? base?.budgetCost ?? 0,
    actualCost: input.data.actualCost ?? base?.actualCost ?? 0,
    progressPct: input.data.progressPct ?? base?.progressPct ?? 0,
    holdbackPct: input.data.holdbackPct ?? base?.holdbackPct ?? 10,
    startDate: input.data.startDate ?? base?.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: input.data.endDate ?? base?.endDate,
    superintendent: input.data.superintendent ?? base?.superintendent ?? "",
    trades: input.data.trades ?? base?.trades ?? [],
  };

  const row = await prisma.constructionJob.upsert({
    where: { id: merged.id },
    create: jobToCreate(companyId, merged),
    update: jobToCreate(companyId, merged),
  });

  return { item: jobFromRow(row) };
}

export async function deleteConstructionJob(companyId: string, id: string) {
  const deleted = await prisma.constructionJob.deleteMany({
    where: { id, companyId },
  });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

export async function upsertConstructionLead(
  companyId: string,
  input: { id?: string; data: Partial<ConstructionLead> }
) {
  const existing = input.id
    ? await prisma.constructionLead.findFirst({
        where: { id: input.id, companyId },
      })
    : null;

  if (input.id && !existing) {
    return { error: "Élément introuvable." as const };
  }

  const base = existing ? leadFromRow(existing) : null;
  const merged: ConstructionLead = {
    id: input.id ?? `clead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.data.name ?? base?.name ?? "Nouveau lead",
    source: input.data.source ?? base?.source ?? "",
    projectType: input.data.projectType ?? base?.projectType ?? "",
    valueEstimate: input.data.valueEstimate ?? base?.valueEstimate ?? 0,
    stage: input.data.stage ?? base?.stage ?? "new",
    owner: input.data.owner ?? base?.owner ?? "",
    city: input.data.city ?? base?.city ?? "",
  };

  const row = await prisma.constructionLead.upsert({
    where: { id: merged.id },
    create: leadToCreate(companyId, merged),
    update: leadToCreate(companyId, merged),
  });

  return { item: leadFromRow(row) };
}

export async function deleteConstructionLead(companyId: string, id: string) {
  const deleted = await prisma.constructionLead.deleteMany({
    where: { id, companyId },
  });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

/** Import jobs/leads from legacy JSON workspace into relational tables (once). */
export async function migrateJobsLeadsFromJson(
  companyId: string,
  jobs: ConstructionJob[],
  leads: ConstructionLead[]
) {
  const [jobCount, leadCount] = await Promise.all([
    prisma.constructionJob.count({ where: { companyId } }),
    prisma.constructionLead.count({ where: { companyId } }),
  ]);

  if (jobCount === 0 && jobs.length > 0) {
    await prisma.constructionJob.createMany({
      data: jobs.map((job) => jobToCreate(companyId, job)),
      skipDuplicates: true,
    });
  }

  if (leadCount === 0 && leads.length > 0) {
    await prisma.constructionLead.createMany({
      data: leads.map((lead) => leadToCreate(companyId, lead)),
      skipDuplicates: true,
    });
  }
}
