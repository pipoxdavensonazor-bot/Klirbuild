import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import {
  deleteConstructionJob,
  deleteConstructionLead,
  listConstructionJobs,
  listConstructionLeads,
  migrateJobsLeadsFromJson,
  upsertConstructionJob,
  upsertConstructionLead,
} from "@/lib/construction/construction-relational-service";
import type { ConstructionEntityKey, ConstructionWorkspaceData } from "@/lib/construction/workspace-types";
import {
  constructionKpisFrom,
  defaultWorkspace,
  newEntityId,
} from "@/lib/construction/workspace-types";

function parseWorkspace(raw: unknown): ConstructionWorkspaceData {
  const base = defaultWorkspace();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<ConstructionWorkspaceData>;
  return {
    jobs: [],
    estimates: Array.isArray(o.estimates) ? o.estimates : base.estimates,
    changeOrders: Array.isArray(o.changeOrders) ? o.changeOrders : base.changeOrders,
    leads: [],
    ccqWorkers: Array.isArray(o.ccqWorkers) ? o.ccqWorkers : base.ccqWorkers,
    ccqDeclarations: Array.isArray(o.ccqDeclarations)
      ? o.ccqDeclarations
      : base.ccqDeclarations,
    progressInvoices: Array.isArray(o.progressInvoices)
      ? o.progressInvoices
      : base.progressInvoices,
    marketingCampaigns: Array.isArray(o.marketingCampaigns)
      ? o.marketingCampaigns
      : base.marketingCampaigns,
    aiSuggestions: Array.isArray(o.aiSuggestions) ? o.aiSuggestions : base.aiSuggestions,
  };
}

function stripLegacyJobsLeads(data: ConstructionWorkspaceData): ConstructionWorkspaceData {
  return { ...data, jobs: [], leads: [] };
}

async function loadJsonWorkspace(companyId: string): Promise<ConstructionWorkspaceData> {
  const row = await prisma.constructionWorkspace.findUnique({
    where: { companyId },
  });
  if (row) return parseWorkspace(row.data);

  const seeded = defaultWorkspace();
  await prisma.constructionWorkspace.create({
    data: { companyId, data: stripLegacyJobsLeads(seeded) as object },
  });
  return seeded;
}

async function loadWorkspace(companyId: string): Promise<ConstructionWorkspaceData> {
  if (!hasDatabase()) return defaultWorkspace();

  const row = await prisma.constructionWorkspace.findUnique({
    where: { companyId },
  });

  const legacyJobs = row && Array.isArray((row.data as { jobs?: unknown }).jobs)
    ? ((row.data as { jobs: ConstructionWorkspaceData["jobs"] }).jobs ?? [])
    : [];
  const legacyLeads = row && Array.isArray((row.data as { leads?: unknown }).leads)
    ? ((row.data as { leads: ConstructionWorkspaceData["leads"] }).leads ?? [])
    : [];

  if (legacyJobs.length > 0 || legacyLeads.length > 0) {
    await migrateJobsLeadsFromJson(companyId, legacyJobs, legacyLeads);
    const json = parseWorkspace(row?.data);
    await prisma.constructionWorkspace.upsert({
      where: { companyId },
      create: { companyId, data: stripLegacyJobsLeads(json) as object },
      update: { data: stripLegacyJobsLeads(json) as object },
    });
  }

  const [jobs, leads, json] = await Promise.all([
    listConstructionJobs(companyId),
    listConstructionLeads(companyId),
    loadJsonWorkspace(companyId),
  ]);

  return { ...json, jobs, leads };
}

async function saveJsonWorkspace(companyId: string, data: ConstructionWorkspaceData) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const payload = stripLegacyJobsLeads(data);
  await prisma.constructionWorkspace.upsert({
    where: { companyId },
    create: { companyId, data: payload as object },
    update: { data: payload as object },
  });
  return { ok: true as const };
}

export async function getConstructionWorkspace(companyId: string) {
  const data = await loadWorkspace(companyId);
  return { data, kpis: constructionKpisFrom(data) };
}

type EntityRecord = Record<string, unknown>;

const idPrefixes: Record<ConstructionEntityKey, string> = {
  jobs: "job",
  estimates: "est",
  changeOrders: "co",
  leads: "clead",
  ccqWorkers: "ccq",
  ccqDeclarations: "dec",
  progressInvoices: "pinv",
  marketingCampaigns: "mkt",
};

export async function upsertConstructionEntity(
  companyId: string,
  entity: ConstructionEntityKey,
  input: { id?: string; data: EntityRecord }
) {
  if (entity === "jobs") {
    const result = await upsertConstructionJob(companyId, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["jobs"][number]>,
    });
    if ("error" in result) return result;
    const workspace = await loadWorkspace(companyId);
    return { item: result.item, workspace };
  }

  if (entity === "leads") {
    const result = await upsertConstructionLead(companyId, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["leads"][number]>,
    });
    if ("error" in result) return result;
    const workspace = await loadWorkspace(companyId);
    return { item: result.item, workspace };
  }

  const ws = await loadWorkspace(companyId);
  const list = ws[entity] as EntityRecord[];
  const id = input.id ?? newEntityId(idPrefixes[entity]);

  if (input.id) {
    const idx = list.findIndex((row) => row.id === input.id);
    if (idx < 0) return { error: "Élément introuvable." as const };
    list[idx] = { ...list[idx], ...input.data, id: input.id };
  } else {
    list.unshift({ ...input.data, id });
  }

  const saveResult = await saveJsonWorkspace(companyId, ws);
  if ("error" in saveResult) return saveResult;
  const item = list.find((row) => row.id === id);
  return { item, workspace: ws };
}

export async function deleteConstructionEntity(
  companyId: string,
  entity: ConstructionEntityKey,
  id: string
) {
  if (entity === "jobs") {
    const result = await deleteConstructionJob(companyId, id);
    if ("error" in result) return result;
    const workspace = await loadWorkspace(companyId);
    return { workspace };
  }

  if (entity === "leads") {
    const result = await deleteConstructionLead(companyId, id);
    if ("error" in result) return result;
    const workspace = await loadWorkspace(companyId);
    return { workspace };
  }

  const ws = await loadWorkspace(companyId);
  const list = ws[entity] as EntityRecord[];
  const next = list.filter((row) => row.id !== id);
  if (next.length === list.length) return { error: "Élément introuvable." as const };
  (ws[entity] as EntityRecord[]) = next;
  const saved = await saveJsonWorkspace(companyId, ws);
  if ("error" in saved) return saved;
  return { workspace: ws };
}

export async function saveAiSuggestions(companyId: string, suggestions: string[]) {
  const ws = await loadWorkspace(companyId);
  ws.aiSuggestions = suggestions.map((s) => s.trim()).filter(Boolean);
  if (ws.aiSuggestions.length === 0) {
    ws.aiSuggestions = defaultWorkspace().aiSuggestions;
  }
  const saved = await saveJsonWorkspace(companyId, ws);
  if ("error" in saved) return saved;
  return { workspace: ws };
}
