import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import type { Deal, DealStage, Lead } from "@/types";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function mapLead(row: {
  id: string;
  companyId: string;
  name: string;
  email: string | null;
  source: string | null;
  status: string;
  score: number;
  ownerName: string | null;
  createdAt: Date;
}): Lead {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    email: row.email ?? "",
    source: row.source ?? "",
    status: row.status as Lead["status"],
    score: row.score,
    owner: row.ownerName ?? "",
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

function mapDeal(row: {
  id: string;
  companyId: string;
  title: string;
  clientName: string | null;
  value: { toNumber(): number } | number;
  stage: string;
  ownerName: string | null;
  closeDate: Date | null;
}): Deal {
  return {
    id: row.id,
    companyId: row.companyId,
    title: row.title,
    clientName: row.clientName ?? "",
    value: dec(row.value),
    stage: row.stage as DealStage,
    owner: row.ownerName ?? "",
    closeDate: row.closeDate?.toISOString().slice(0, 10) ?? "",
  };
}

export async function listLeads(companyId: string): Promise<Lead[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.lead.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapLead);
}

export async function listDeals(companyId: string): Promise<Deal[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.deal.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(mapDeal);
}

export async function upsertLead(
  companyId: string,
  input: {
    id?: string;
    name: string;
    email?: string;
    source?: string;
    status?: Lead["status"];
    score?: number;
    owner?: string;
  }
) {
  const name = input.name.trim();
  if (!name) return { error: "Nom requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  if (input.id) {
    const row = await prisma.lead.update({
      where: { id: input.id },
      data: {
        name,
        email: input.email ?? null,
        source: input.source ?? null,
        status: input.status ?? undefined,
        score: input.score ?? undefined,
        ownerName: input.owner ?? null,
      },
    });
    return { lead: mapLead(row) };
  }
  const row = await prisma.lead.create({
    data: {
      companyId,
      name,
      email: input.email ?? null,
      source: input.source ?? "Manuel",
      status: input.status ?? "new",
      score: input.score ?? 0,
      ownerName: input.owner ?? null,
    },
  });
  return { lead: mapLead(row) };
}

export async function upsertDeal(
  companyId: string,
  input: {
    id?: string;
    title: string;
    clientName?: string;
    value?: number;
    stage?: DealStage;
    owner?: string;
    closeDate?: string;
  }
) {
  const title = input.title.trim();
  if (!title) return { error: "Titre requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  if (input.id) {
    const row = await prisma.deal.update({
      where: { id: input.id },
      data: {
        title,
        clientName: input.clientName ?? null,
        value: input.value ?? undefined,
        stage: input.stage ?? undefined,
        ownerName: input.owner ?? null,
        closeDate: input.closeDate ? new Date(input.closeDate) : undefined,
      },
    });
    return { deal: mapDeal(row) };
  }
  const row = await prisma.deal.create({
    data: {
      companyId,
      title,
      clientName: input.clientName ?? null,
      value: input.value ?? 0,
      stage: input.stage ?? "new",
      ownerName: input.owner ?? null,
      closeDate: input.closeDate ? new Date(input.closeDate) : null,
    },
  });
  return { deal: mapDeal(row) };
}

export async function deleteLead(companyId: string, id: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  const row = await prisma.lead.findFirst({ where: { id, companyId } });
  if (!row) return { error: "Lead introuvable." as const };
  await prisma.lead.delete({ where: { id } });
  return { ok: true as const };
}

export async function deleteDeal(companyId: string, id: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  const row = await prisma.deal.findFirst({ where: { id, companyId } });
  if (!row) return { error: "Deal introuvable." as const };
  await prisma.deal.delete({ where: { id } });
  return { ok: true as const };
}

export function crmKpis(leads: Lead[], deals: Deal[]) {
  const pipeline = deals
    .filter((d) => !["won", "lost"].includes(d.stage))
    .reduce((s, d) => s + d.value, 0);
  return {
    pipeline,
    openLeads: leads.filter((l) => l.status !== "unqualified").length,
    wonDeals: deals.filter((d) => d.stage === "won").length,
  };
}
