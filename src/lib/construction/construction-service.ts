import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import type { ConstructionEntityKey, ConstructionWorkspaceData } from "@/lib/construction/workspace-types";
import {
  constructionKpisFrom,
  defaultWorkspace,
  newEntityId,
} from "@/lib/construction/workspace-types";

const memory = new Map<string, ConstructionWorkspaceData>();

function parseWorkspace(raw: unknown): ConstructionWorkspaceData {
  const base = defaultWorkspace();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<ConstructionWorkspaceData>;
  return {
    jobs: Array.isArray(o.jobs) ? o.jobs : base.jobs,
    estimates: Array.isArray(o.estimates) ? o.estimates : base.estimates,
    changeOrders: Array.isArray(o.changeOrders) ? o.changeOrders : base.changeOrders,
    leads: Array.isArray(o.leads) ? o.leads : base.leads,
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

async function loadWorkspace(companyId: string): Promise<ConstructionWorkspaceData> {
  if (hasDatabase()) {
    try {
      const row = await prisma.constructionWorkspace.findUnique({
        where: { companyId },
      });
      if (row) return parseWorkspace(row.data);
      const seeded = defaultWorkspace();
      await prisma.constructionWorkspace.create({
        data: { companyId, data: seeded as object },
      });
      return seeded;
    } catch {
      /* table may not exist yet — fall through */
    }
  }
  if (!memory.has(companyId)) memory.set(companyId, defaultWorkspace());
  return memory.get(companyId)!;
}

async function saveWorkspace(companyId: string, data: ConstructionWorkspaceData) {
  memory.set(companyId, data);
  if (hasDatabase()) {
    try {
      await prisma.constructionWorkspace.upsert({
        where: { companyId },
        create: { companyId, data: data as object },
        update: { data: data as object },
      });
    } catch {
      /* keep memory copy */
    }
  }
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

  await saveWorkspace(companyId, ws);
  const saved = list.find((row) => row.id === id);
  return { item: saved, workspace: ws };
}

export async function deleteConstructionEntity(
  companyId: string,
  entity: ConstructionEntityKey,
  id: string
) {
  const ws = await loadWorkspace(companyId);
  const list = ws[entity] as EntityRecord[];
  const next = list.filter((row) => row.id !== id);
  if (next.length === list.length) return { error: "Élément introuvable." as const };
  (ws[entity] as EntityRecord[]) = next;
  await saveWorkspace(companyId, ws);
  return { workspace: ws };
}

export async function saveAiSuggestions(companyId: string, suggestions: string[]) {
  const ws = await loadWorkspace(companyId);
  ws.aiSuggestions = suggestions.map((s) => s.trim()).filter(Boolean);
  if (ws.aiSuggestions.length === 0) {
    ws.aiSuggestions = defaultWorkspace().aiSuggestions;
  }
  await saveWorkspace(companyId, ws);
  return { workspace: ws };
}
