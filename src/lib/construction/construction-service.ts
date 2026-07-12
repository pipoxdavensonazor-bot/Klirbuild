import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import {
  deleteConstructionEstimate,
  deleteConstructionChangeOrder,
  deleteConstructionCcqDeclaration,
  deleteConstructionCcqWorker,
  deleteConstructionMarketingCampaign,
  deleteConstructionProgressInvoice,
  listConstructionChangeOrders,
  listConstructionCcqDeclarations,
  listConstructionCcqWorkers,
  listConstructionEstimates,
  listConstructionMarketingCampaigns,
  listConstructionProgressInvoices,
  migrateExtraEntitiesFromJson,
  upsertConstructionChangeOrder,
  upsertConstructionCcqDeclaration,
  upsertConstructionCcqWorker,
  upsertConstructionEstimate,
  upsertConstructionMarketingCampaign,
  upsertConstructionProgressInvoice,
} from "@/lib/construction/construction-extra-relational";
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

const RELATIONAL_KEYS: ConstructionEntityKey[] = [
  "jobs",
  "estimates",
  "changeOrders",
  "leads",
  "ccqWorkers",
  "ccqDeclarations",
  "progressInvoices",
  "marketingCampaigns",
];

function emptyRelational(): Pick<
  ConstructionWorkspaceData,
  | "jobs"
  | "estimates"
  | "changeOrders"
  | "leads"
  | "ccqWorkers"
  | "ccqDeclarations"
  | "progressInvoices"
  | "marketingCampaigns"
> {
  return {
    jobs: [],
    estimates: [],
    changeOrders: [],
    leads: [],
    ccqWorkers: [],
    ccqDeclarations: [],
    progressInvoices: [],
    marketingCampaigns: [],
  };
}

function parseWorkspace(raw: unknown): ConstructionWorkspaceData {
  const base = defaultWorkspace();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<ConstructionWorkspaceData>;
  return {
    ...emptyRelational(),
    aiSuggestions: Array.isArray(o.aiSuggestions) ? o.aiSuggestions : base.aiSuggestions,
  };
}

function stripRelationalPayload(data: ConstructionWorkspaceData): ConstructionWorkspaceData {
  return { ...emptyRelational(), aiSuggestions: data.aiSuggestions };
}

function legacySlice<T>(raw: unknown, key: string): T[] {
  if (!raw || typeof raw !== "object") return [];
  const value = (raw as Record<string, unknown>)[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

async function loadJsonWorkspace(companyId: string): Promise<ConstructionWorkspaceData> {
  const row = await prisma.constructionWorkspace.findUnique({
    where: { companyId },
  });
  if (row) return parseWorkspace(row.data);

  const seeded = defaultWorkspace();
  await prisma.constructionWorkspace.create({
    data: { companyId, data: stripRelationalPayload(seeded) as object },
  });
  return seeded;
}

async function loadRelationalEntities(companyId: string) {
  const [
    jobs,
    estimates,
    changeOrders,
    leads,
    ccqWorkers,
    ccqDeclarations,
    progressInvoices,
    marketingCampaigns,
    json,
  ] = await Promise.all([
    listConstructionJobs(companyId),
    listConstructionEstimates(companyId),
    listConstructionChangeOrders(companyId),
    listConstructionLeads(companyId),
    listConstructionCcqWorkers(companyId),
    listConstructionCcqDeclarations(companyId),
    listConstructionProgressInvoices(companyId),
    listConstructionMarketingCampaigns(companyId),
    loadJsonWorkspace(companyId),
  ]);

  return {
    jobs,
    estimates,
    changeOrders,
    leads,
    ccqWorkers,
    ccqDeclarations,
    progressInvoices,
    marketingCampaigns,
    aiSuggestions: json.aiSuggestions,
  };
}

async function maybeMigrateLegacy(companyId: string) {
  const row = await prisma.constructionWorkspace.findUnique({ where: { companyId } });
  if (!row?.data || typeof row.data !== "object") return;

  const raw = row.data as Record<string, unknown>;
  const legacyJobs = legacySlice<ConstructionWorkspaceData["jobs"][number]>(raw, "jobs");
  const legacyLeads = legacySlice<ConstructionWorkspaceData["leads"][number]>(raw, "leads");
  const legacyEstimates = legacySlice<ConstructionWorkspaceData["estimates"][number]>(raw, "estimates");
  const legacyChangeOrders = legacySlice<ConstructionWorkspaceData["changeOrders"][number]>(
    raw,
    "changeOrders"
  );
  const legacyProgress = legacySlice<ConstructionWorkspaceData["progressInvoices"][number]>(
    raw,
    "progressInvoices"
  );
  const legacyCcqWorkers = legacySlice<ConstructionWorkspaceData["ccqWorkers"][number]>(
    raw,
    "ccqWorkers"
  );
  const legacyCcqDecl = legacySlice<ConstructionWorkspaceData["ccqDeclarations"][number]>(
    raw,
    "ccqDeclarations"
  );
  const legacyMarketing = legacySlice<ConstructionWorkspaceData["marketingCampaigns"][number]>(
    raw,
    "marketingCampaigns"
  );

  const hasLegacy =
    legacyJobs.length > 0 ||
    legacyLeads.length > 0 ||
    legacyEstimates.length > 0 ||
    legacyChangeOrders.length > 0 ||
    legacyProgress.length > 0 ||
    legacyCcqWorkers.length > 0 ||
    legacyCcqDecl.length > 0 ||
    legacyMarketing.length > 0;

  if (!hasLegacy) return;

  await migrateJobsLeadsFromJson(companyId, legacyJobs, legacyLeads);
  await migrateExtraEntitiesFromJson(companyId, {
    estimates: legacyEstimates,
    changeOrders: legacyChangeOrders,
    progressInvoices: legacyProgress,
    ccqWorkers: legacyCcqWorkers,
    ccqDeclarations: legacyCcqDecl,
    marketingCampaigns: legacyMarketing,
  });

  const json = parseWorkspace(row.data);
  await prisma.constructionWorkspace.update({
    where: { companyId },
    data: { data: stripRelationalPayload(json) as object },
  });
}

async function loadWorkspace(companyId: string): Promise<ConstructionWorkspaceData> {
  if (!hasDatabase()) return defaultWorkspace();

  await maybeMigrateLegacy(companyId);
  return loadRelationalEntities(companyId);
}

async function saveJsonWorkspace(companyId: string, data: ConstructionWorkspaceData) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const payload = stripRelationalPayload(data);
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

type UpsertFn = (
  companyId: string,
  input: { id?: string; data: EntityRecord }
) => Promise<{ item?: unknown; error?: string }>;

type DeleteFn = (companyId: string, id: string) => Promise<{ ok?: true; error?: string }>;

const upsertHandlers: Record<ConstructionEntityKey, UpsertFn> = {
  jobs: (cid, input) =>
    upsertConstructionJob(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["jobs"][number]>,
    }),
  leads: (cid, input) =>
    upsertConstructionLead(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["leads"][number]>,
    }),
  estimates: (cid, input) =>
    upsertConstructionEstimate(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["estimates"][number]>,
    }),
  changeOrders: (cid, input) =>
    upsertConstructionChangeOrder(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["changeOrders"][number]>,
    }),
  progressInvoices: (cid, input) =>
    upsertConstructionProgressInvoice(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["progressInvoices"][number]>,
    }),
  ccqWorkers: (cid, input) =>
    upsertConstructionCcqWorker(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["ccqWorkers"][number]>,
    }),
  ccqDeclarations: (cid, input) =>
    upsertConstructionCcqDeclaration(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["ccqDeclarations"][number]>,
    }),
  marketingCampaigns: (cid, input) =>
    upsertConstructionMarketingCampaign(cid, {
      id: input.id,
      data: input.data as Partial<ConstructionWorkspaceData["marketingCampaigns"][number]>,
    }),
};

const deleteHandlers: Record<ConstructionEntityKey, DeleteFn> = {
  jobs: deleteConstructionJob,
  leads: deleteConstructionLead,
  estimates: deleteConstructionEstimate,
  changeOrders: deleteConstructionChangeOrder,
  progressInvoices: deleteConstructionProgressInvoice,
  ccqWorkers: deleteConstructionCcqWorker,
  ccqDeclarations: deleteConstructionCcqDeclaration,
  marketingCampaigns: deleteConstructionMarketingCampaign,
};

export async function upsertConstructionEntity(
  companyId: string,
  entity: ConstructionEntityKey,
  input: { id?: string; data: EntityRecord }
) {
  if (RELATIONAL_KEYS.includes(entity)) {
    const result = await upsertHandlers[entity](companyId, input);
    if ("error" in result && result.error) return result;
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
  if (RELATIONAL_KEYS.includes(entity)) {
    const result = await deleteHandlers[entity](companyId, id);
    if ("error" in result && result.error) return result;
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
