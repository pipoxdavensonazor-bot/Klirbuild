import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  ChangeOrder,
  ConstructionEstimate,
  CcqHourDeclaration,
  CcqWorker,
  MarketingCampaign,
  ProgressInvoice,
} from "@/modules/construction-os/types";

function decimal(n: number) {
  return new Prisma.Decimal(n);
}

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === "number" ? value : value.toNumber();
}

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Estimates ───

export function estimateFromRow(row: {
  id: string;
  number: string;
  jobId: string | null;
  clientName: string;
  title: string;
  status: string;
  subtotal: Prisma.Decimal;
  tps: Prisma.Decimal;
  tvq: Prisma.Decimal;
  total: Prisma.Decimal;
  validUntil: string;
  linesJson: unknown;
}): ConstructionEstimate {
  const lines = Array.isArray(row.linesJson) ? row.linesJson : [];
  return {
    id: row.id,
    number: row.number,
    jobId: row.jobId ?? undefined,
    clientName: row.clientName,
    title: row.title,
    status: row.status as ConstructionEstimate["status"],
    subtotal: toNumber(row.subtotal),
    tps: toNumber(row.tps),
    tvq: toNumber(row.tvq),
    total: toNumber(row.total),
    validUntil: row.validUntil,
    lines: lines as ConstructionEstimate["lines"],
  };
}

export async function listConstructionEstimates(companyId: string) {
  const rows = await prisma.constructionEstimate.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(estimateFromRow);
}

export async function upsertConstructionEstimate(
  companyId: string,
  input: { id?: string; data: Partial<ConstructionEstimate> }
) {
  const existing = input.id
    ? await prisma.constructionEstimate.findFirst({ where: { id: input.id, companyId } })
    : null;
  if (input.id && !existing) return { error: "Élément introuvable." as const };

  const base = existing ? estimateFromRow(existing) : null;
  const merged: ConstructionEstimate = {
    id: input.id ?? newId("est"),
    number: input.data.number ?? base?.number ?? `EST-${Date.now()}`,
    jobId: input.data.jobId ?? base?.jobId,
    clientName: input.data.clientName ?? base?.clientName ?? "",
    title: input.data.title ?? base?.title ?? "Nouvelle soumission",
    status: input.data.status ?? base?.status ?? "draft",
    subtotal: input.data.subtotal ?? base?.subtotal ?? 0,
    tps: input.data.tps ?? base?.tps ?? 0,
    tvq: input.data.tvq ?? base?.tvq ?? 0,
    total: input.data.total ?? base?.total ?? 0,
    validUntil: input.data.validUntil ?? base?.validUntil ?? new Date().toISOString().slice(0, 10),
    lines: input.data.lines ?? base?.lines ?? [],
  };

  const row = await prisma.constructionEstimate.upsert({
    where: { id: merged.id },
    create: {
      id: merged.id,
      companyId,
      number: merged.number,
      jobId: merged.jobId ?? null,
      clientName: merged.clientName,
      title: merged.title,
      status: merged.status,
      subtotal: decimal(merged.subtotal),
      tps: decimal(merged.tps),
      tvq: decimal(merged.tvq),
      total: decimal(merged.total),
      validUntil: merged.validUntil,
      linesJson: merged.lines as object,
    },
    update: {
      number: merged.number,
      jobId: merged.jobId ?? null,
      clientName: merged.clientName,
      title: merged.title,
      status: merged.status,
      subtotal: decimal(merged.subtotal),
      tps: decimal(merged.tps),
      tvq: decimal(merged.tvq),
      total: decimal(merged.total),
      validUntil: merged.validUntil,
      linesJson: merged.lines as object,
    },
  });
  return { item: estimateFromRow(row) };
}

export async function deleteConstructionEstimate(companyId: string, id: string) {
  const deleted = await prisma.constructionEstimate.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

// ─── Change orders ───

function changeOrderFromRow(row: {
  id: string;
  number: string;
  jobId: string;
  jobName: string;
  title: string;
  reason: string;
  amount: Prisma.Decimal;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
}): ChangeOrder {
  return {
    id: row.id,
    number: row.number,
    jobId: row.jobId,
    jobName: row.jobName,
    title: row.title,
    reason: row.reason,
    amount: toNumber(row.amount),
    status: row.status as ChangeOrder["status"],
    submittedAt: row.submittedAt ?? undefined,
    approvedAt: row.approvedAt ?? undefined,
  };
}

export async function listConstructionChangeOrders(companyId: string) {
  const rows = await prisma.constructionChangeOrder.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(changeOrderFromRow);
}

export async function upsertConstructionChangeOrder(
  companyId: string,
  input: { id?: string; data: Partial<ChangeOrder> }
) {
  const existing = input.id
    ? await prisma.constructionChangeOrder.findFirst({ where: { id: input.id, companyId } })
    : null;
  if (input.id && !existing) return { error: "Élément introuvable." as const };

  const base = existing ? changeOrderFromRow(existing) : null;
  const merged: ChangeOrder = {
    id: input.id ?? newId("co"),
    number: input.data.number ?? base?.number ?? `CO-${Date.now()}`,
    jobId: input.data.jobId ?? base?.jobId ?? "",
    jobName: input.data.jobName ?? base?.jobName ?? "",
    title: input.data.title ?? base?.title ?? "",
    reason: input.data.reason ?? base?.reason ?? "",
    amount: input.data.amount ?? base?.amount ?? 0,
    status: input.data.status ?? base?.status ?? "draft",
    submittedAt: input.data.submittedAt ?? base?.submittedAt,
    approvedAt: input.data.approvedAt ?? base?.approvedAt,
  };

  const row = await prisma.constructionChangeOrder.upsert({
    where: { id: merged.id },
    create: {
      id: merged.id,
      companyId,
      number: merged.number,
      jobId: merged.jobId,
      jobName: merged.jobName,
      title: merged.title,
      reason: merged.reason,
      amount: decimal(merged.amount),
      status: merged.status,
      submittedAt: merged.submittedAt ?? null,
      approvedAt: merged.approvedAt ?? null,
    },
    update: {
      number: merged.number,
      jobId: merged.jobId,
      jobName: merged.jobName,
      title: merged.title,
      reason: merged.reason,
      amount: decimal(merged.amount),
      status: merged.status,
      submittedAt: merged.submittedAt ?? null,
      approvedAt: merged.approvedAt ?? null,
    },
  });
  return { item: changeOrderFromRow(row) };
}

export async function deleteConstructionChangeOrder(companyId: string, id: string) {
  const deleted = await prisma.constructionChangeOrder.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

// ─── Progress invoices ───

function progressInvoiceFromRow(row: {
  id: string;
  jobId: string;
  jobName: string;
  number: string;
  periodLabel: string;
  completionPct: number;
  amount: Prisma.Decimal;
  holdback: Prisma.Decimal;
  netDue: Prisma.Decimal;
  status: string;
  dueDate: string;
}): ProgressInvoice {
  return {
    id: row.id,
    jobId: row.jobId,
    jobName: row.jobName,
    number: row.number,
    periodLabel: row.periodLabel,
    completionPct: row.completionPct,
    amount: toNumber(row.amount),
    holdback: toNumber(row.holdback),
    netDue: toNumber(row.netDue),
    status: row.status as ProgressInvoice["status"],
    dueDate: row.dueDate,
  };
}

export async function listConstructionProgressInvoices(companyId: string) {
  const rows = await prisma.constructionProgressInvoice.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(progressInvoiceFromRow);
}

export async function upsertConstructionProgressInvoice(
  companyId: string,
  input: { id?: string; data: Partial<ProgressInvoice> }
) {
  const existing = input.id
    ? await prisma.constructionProgressInvoice.findFirst({ where: { id: input.id, companyId } })
    : null;
  if (input.id && !existing) return { error: "Élément introuvable." as const };

  const base = existing ? progressInvoiceFromRow(existing) : null;
  const merged: ProgressInvoice = {
    id: input.id ?? newId("pinv"),
    jobId: input.data.jobId ?? base?.jobId ?? "",
    jobName: input.data.jobName ?? base?.jobName ?? "",
    number: input.data.number ?? base?.number ?? `PINV-${Date.now()}`,
    periodLabel: input.data.periodLabel ?? base?.periodLabel ?? "",
    completionPct: input.data.completionPct ?? base?.completionPct ?? 0,
    amount: input.data.amount ?? base?.amount ?? 0,
    holdback: input.data.holdback ?? base?.holdback ?? 0,
    netDue: input.data.netDue ?? base?.netDue ?? 0,
    status: input.data.status ?? base?.status ?? "draft",
    dueDate: input.data.dueDate ?? base?.dueDate ?? new Date().toISOString().slice(0, 10),
  };

  const row = await prisma.constructionProgressInvoice.upsert({
    where: { id: merged.id },
    create: {
      id: merged.id,
      companyId,
      jobId: merged.jobId,
      jobName: merged.jobName,
      number: merged.number,
      periodLabel: merged.periodLabel,
      completionPct: merged.completionPct,
      amount: decimal(merged.amount),
      holdback: decimal(merged.holdback),
      netDue: decimal(merged.netDue),
      status: merged.status,
      dueDate: merged.dueDate,
    },
    update: {
      jobId: merged.jobId,
      jobName: merged.jobName,
      number: merged.number,
      periodLabel: merged.periodLabel,
      completionPct: merged.completionPct,
      amount: decimal(merged.amount),
      holdback: decimal(merged.holdback),
      netDue: decimal(merged.netDue),
      status: merged.status,
      dueDate: merged.dueDate,
    },
  });
  return { item: progressInvoiceFromRow(row) };
}

export async function deleteConstructionProgressInvoice(companyId: string, id: string) {
  const deleted = await prisma.constructionProgressInvoice.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

// ─── CCQ workers ───

function ccqWorkerFromRow(row: {
  id: string;
  name: string;
  trade: string;
  competency: string;
  ccqNumber: string;
  cardExpires: string;
  hoursThisPeriod: Prisma.Decimal;
  apprenticeshipRatioOk: boolean;
  trainingDue: string | null;
}): CcqWorker {
  return {
    id: row.id,
    name: row.name,
    trade: row.trade as CcqWorker["trade"],
    competency: row.competency as CcqWorker["competency"],
    ccqNumber: row.ccqNumber,
    cardExpires: row.cardExpires,
    hoursThisPeriod: toNumber(row.hoursThisPeriod),
    apprenticeshipRatioOk: row.apprenticeshipRatioOk,
    trainingDue: row.trainingDue ?? undefined,
  };
}

export async function listConstructionCcqWorkers(companyId: string) {
  const rows = await prisma.constructionCcqWorker.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(ccqWorkerFromRow);
}

export async function upsertConstructionCcqWorker(
  companyId: string,
  input: { id?: string; data: Partial<CcqWorker> }
) {
  const existing = input.id
    ? await prisma.constructionCcqWorker.findFirst({ where: { id: input.id, companyId } })
    : null;
  if (input.id && !existing) return { error: "Élément introuvable." as const };

  const base = existing ? ccqWorkerFromRow(existing) : null;
  const merged: CcqWorker = {
    id: input.id ?? newId("ccq"),
    name: input.data.name ?? base?.name ?? "",
    trade: input.data.trade ?? base?.trade ?? "manoeuvre",
    competency: input.data.competency ?? base?.competency ?? "compagnon",
    ccqNumber: input.data.ccqNumber ?? base?.ccqNumber ?? "",
    cardExpires: input.data.cardExpires ?? base?.cardExpires ?? "",
    hoursThisPeriod: input.data.hoursThisPeriod ?? base?.hoursThisPeriod ?? 0,
    apprenticeshipRatioOk: input.data.apprenticeshipRatioOk ?? base?.apprenticeshipRatioOk ?? true,
    trainingDue: input.data.trainingDue ?? base?.trainingDue,
  };

  const row = await prisma.constructionCcqWorker.upsert({
    where: { id: merged.id },
    create: {
      id: merged.id,
      companyId,
      name: merged.name,
      trade: merged.trade,
      competency: merged.competency,
      ccqNumber: merged.ccqNumber,
      cardExpires: merged.cardExpires,
      hoursThisPeriod: decimal(merged.hoursThisPeriod),
      apprenticeshipRatioOk: merged.apprenticeshipRatioOk,
      trainingDue: merged.trainingDue ?? null,
    },
    update: {
      name: merged.name,
      trade: merged.trade,
      competency: merged.competency,
      ccqNumber: merged.ccqNumber,
      cardExpires: merged.cardExpires,
      hoursThisPeriod: decimal(merged.hoursThisPeriod),
      apprenticeshipRatioOk: merged.apprenticeshipRatioOk,
      trainingDue: merged.trainingDue ?? null,
    },
  });
  return { item: ccqWorkerFromRow(row) };
}

export async function deleteConstructionCcqWorker(companyId: string, id: string) {
  const deleted = await prisma.constructionCcqWorker.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

// ─── CCQ declarations ───

function ccqDeclarationFromRow(row: {
  id: string;
  workerId: string;
  workerName: string;
  jobId: string;
  jobName: string;
  trade: string;
  weekEnding: string;
  hours: Prisma.Decimal;
  status: string;
}): CcqHourDeclaration {
  return {
    id: row.id,
    workerId: row.workerId,
    workerName: row.workerName,
    jobId: row.jobId,
    jobName: row.jobName,
    trade: row.trade as CcqHourDeclaration["trade"],
    weekEnding: row.weekEnding,
    hours: toNumber(row.hours),
    status: row.status as CcqHourDeclaration["status"],
  };
}

export async function listConstructionCcqDeclarations(companyId: string) {
  const rows = await prisma.constructionCcqDeclaration.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(ccqDeclarationFromRow);
}

export async function upsertConstructionCcqDeclaration(
  companyId: string,
  input: { id?: string; data: Partial<CcqHourDeclaration> }
) {
  const existing = input.id
    ? await prisma.constructionCcqDeclaration.findFirst({ where: { id: input.id, companyId } })
    : null;
  if (input.id && !existing) return { error: "Élément introuvable." as const };

  const base = existing ? ccqDeclarationFromRow(existing) : null;
  const merged: CcqHourDeclaration = {
    id: input.id ?? newId("dec"),
    workerId: input.data.workerId ?? base?.workerId ?? "",
    workerName: input.data.workerName ?? base?.workerName ?? "",
    jobId: input.data.jobId ?? base?.jobId ?? "",
    jobName: input.data.jobName ?? base?.jobName ?? "",
    trade: input.data.trade ?? base?.trade ?? "manoeuvre",
    weekEnding: input.data.weekEnding ?? base?.weekEnding ?? "",
    hours: input.data.hours ?? base?.hours ?? 0,
    status: input.data.status ?? base?.status ?? "draft",
  };

  const row = await prisma.constructionCcqDeclaration.upsert({
    where: { id: merged.id },
    create: {
      id: merged.id,
      companyId,
      workerId: merged.workerId,
      workerName: merged.workerName,
      jobId: merged.jobId,
      jobName: merged.jobName,
      trade: merged.trade,
      weekEnding: merged.weekEnding,
      hours: decimal(merged.hours),
      status: merged.status,
    },
    update: {
      workerId: merged.workerId,
      workerName: merged.workerName,
      jobId: merged.jobId,
      jobName: merged.jobName,
      trade: merged.trade,
      weekEnding: merged.weekEnding,
      hours: decimal(merged.hours),
      status: merged.status,
    },
  });
  return { item: ccqDeclarationFromRow(row) };
}

export async function deleteConstructionCcqDeclaration(companyId: string, id: string) {
  const deleted = await prisma.constructionCcqDeclaration.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

// ─── Marketing campaigns ───

function marketingCampaignFromRow(row: {
  id: string;
  name: string;
  channel: string;
  status: string;
  spend: Prisma.Decimal;
  leads: number;
  contracts: number;
  revenue: Prisma.Decimal;
}): MarketingCampaign {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel as MarketingCampaign["channel"],
    status: row.status as MarketingCampaign["status"],
    spend: toNumber(row.spend),
    leads: row.leads,
    contracts: row.contracts,
    revenue: toNumber(row.revenue),
  };
}

export async function listConstructionMarketingCampaigns(companyId: string) {
  const rows = await prisma.constructionMarketingCampaign.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(marketingCampaignFromRow);
}

export async function upsertConstructionMarketingCampaign(
  companyId: string,
  input: { id?: string; data: Partial<MarketingCampaign> }
) {
  const existing = input.id
    ? await prisma.constructionMarketingCampaign.findFirst({ where: { id: input.id, companyId } })
    : null;
  if (input.id && !existing) return { error: "Élément introuvable." as const };

  const base = existing ? marketingCampaignFromRow(existing) : null;
  const merged: MarketingCampaign = {
    id: input.id ?? newId("mkt"),
    name: input.data.name ?? base?.name ?? "",
    channel: input.data.channel ?? base?.channel ?? "google",
    status: input.data.status ?? base?.status ?? "active",
    spend: input.data.spend ?? base?.spend ?? 0,
    leads: input.data.leads ?? base?.leads ?? 0,
    contracts: input.data.contracts ?? base?.contracts ?? 0,
    revenue: input.data.revenue ?? base?.revenue ?? 0,
  };

  const row = await prisma.constructionMarketingCampaign.upsert({
    where: { id: merged.id },
    create: {
      id: merged.id,
      companyId,
      name: merged.name,
      channel: merged.channel,
      status: merged.status,
      spend: decimal(merged.spend),
      leads: merged.leads,
      contracts: merged.contracts,
      revenue: decimal(merged.revenue),
    },
    update: {
      name: merged.name,
      channel: merged.channel,
      status: merged.status,
      spend: decimal(merged.spend),
      leads: merged.leads,
      contracts: merged.contracts,
      revenue: decimal(merged.revenue),
    },
  });
  return { item: marketingCampaignFromRow(row) };
}

export async function deleteConstructionMarketingCampaign(companyId: string, id: string) {
  const deleted = await prisma.constructionMarketingCampaign.deleteMany({ where: { id, companyId } });
  if (deleted.count === 0) return { error: "Élément introuvable." as const };
  return { ok: true as const };
}

/** Import remaining entities from legacy JSON workspace (once per entity type). */
export async function migrateExtraEntitiesFromJson(
  companyId: string,
  data: {
    estimates: ConstructionEstimate[];
    changeOrders: ChangeOrder[];
    progressInvoices: ProgressInvoice[];
    ccqWorkers: CcqWorker[];
    ccqDeclarations: CcqHourDeclaration[];
    marketingCampaigns: MarketingCampaign[];
  }
) {
  const counts = await Promise.all([
    prisma.constructionEstimate.count({ where: { companyId } }),
    prisma.constructionChangeOrder.count({ where: { companyId } }),
    prisma.constructionProgressInvoice.count({ where: { companyId } }),
    prisma.constructionCcqWorker.count({ where: { companyId } }),
    prisma.constructionCcqDeclaration.count({ where: { companyId } }),
    prisma.constructionMarketingCampaign.count({ where: { companyId } }),
  ]);

  if (counts[0] === 0 && data.estimates.length > 0) {
    await prisma.constructionEstimate.createMany({
      data: data.estimates.map((e) => ({
        id: e.id,
        companyId,
        number: e.number,
        jobId: e.jobId ?? null,
        clientName: e.clientName,
        title: e.title,
        status: e.status,
        subtotal: decimal(e.subtotal),
        tps: decimal(e.tps),
        tvq: decimal(e.tvq),
        total: decimal(e.total),
        validUntil: e.validUntil,
        linesJson: e.lines as object,
      })),
      skipDuplicates: true,
    });
  }

  if (counts[1] === 0 && data.changeOrders.length > 0) {
    await prisma.constructionChangeOrder.createMany({
      data: data.changeOrders.map((c) => ({
        id: c.id,
        companyId,
        number: c.number,
        jobId: c.jobId,
        jobName: c.jobName,
        title: c.title,
        reason: c.reason,
        amount: decimal(c.amount),
        status: c.status,
        submittedAt: c.submittedAt ?? null,
        approvedAt: c.approvedAt ?? null,
      })),
      skipDuplicates: true,
    });
  }

  if (counts[2] === 0 && data.progressInvoices.length > 0) {
    await prisma.constructionProgressInvoice.createMany({
      data: data.progressInvoices.map((p) => ({
        id: p.id,
        companyId,
        jobId: p.jobId,
        jobName: p.jobName,
        number: p.number,
        periodLabel: p.periodLabel,
        completionPct: p.completionPct,
        amount: decimal(p.amount),
        holdback: decimal(p.holdback),
        netDue: decimal(p.netDue),
        status: p.status,
        dueDate: p.dueDate,
      })),
      skipDuplicates: true,
    });
  }

  if (counts[3] === 0 && data.ccqWorkers.length > 0) {
    await prisma.constructionCcqWorker.createMany({
      data: data.ccqWorkers.map((w) => ({
        id: w.id,
        companyId,
        name: w.name,
        trade: w.trade,
        competency: w.competency,
        ccqNumber: w.ccqNumber,
        cardExpires: w.cardExpires,
        hoursThisPeriod: decimal(w.hoursThisPeriod),
        apprenticeshipRatioOk: w.apprenticeshipRatioOk,
        trainingDue: w.trainingDue ?? null,
      })),
      skipDuplicates: true,
    });
  }

  if (counts[4] === 0 && data.ccqDeclarations.length > 0) {
    await prisma.constructionCcqDeclaration.createMany({
      data: data.ccqDeclarations.map((d) => ({
        id: d.id,
        companyId,
        workerId: d.workerId,
        workerName: d.workerName,
        jobId: d.jobId,
        jobName: d.jobName,
        trade: d.trade,
        weekEnding: d.weekEnding,
        hours: decimal(d.hours),
        status: d.status,
      })),
      skipDuplicates: true,
    });
  }

  if (counts[5] === 0 && data.marketingCampaigns.length > 0) {
    await prisma.constructionMarketingCampaign.createMany({
      data: data.marketingCampaigns.map((m) => ({
        id: m.id,
        companyId,
        name: m.name,
        channel: m.channel,
        status: m.status,
        spend: decimal(m.spend),
        leads: m.leads,
        contracts: m.contracts,
        revenue: decimal(m.revenue),
      })),
      skipDuplicates: true,
    });
  }
}
