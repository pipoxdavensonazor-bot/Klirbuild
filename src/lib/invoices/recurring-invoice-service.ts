import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import { createInvoice } from "@/lib/invoices/invoice-service";
import type { MarketRegionId } from "@/lib/markets/regions";
import type { LineItemInput } from "@/lib/tax/document-tax";

export type RecurringInterval = "weekly" | "monthly" | "quarterly" | "yearly";

export type RecurringInvoiceSummary = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: string;
  interval: RecurringInterval;
  currency: string;
  marketRegion: string;
  nextRunAt: string;
  lastRunAt: string | null;
  totalItems: number;
};

function asLineItems(value: unknown): LineItemInput[] {
  if (!Array.isArray(value)) return [];
  const items: LineItemInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const description = typeof row.description === "string" ? row.description.trim() : "";
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.unitPrice);
    const unit = typeof row.unit === "string" ? row.unit : undefined;
    if (!description || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) continue;
    items.push({ description, quantity, unitPrice, unit });
  }
  return items;
}

function addInterval(date: Date, interval: RecurringInterval) {
  const next = new Date(date);
  if (interval === "weekly") next.setDate(next.getDate() + 7);
  if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  if (interval === "quarterly") next.setMonth(next.getMonth() + 3);
  if (interval === "yearly") next.setFullYear(next.getFullYear() + 1);
  return next;
}

function mapRecurring(row: {
  id: string;
  name: string;
  clientId: string | null;
  client?: { name: string } | null;
  status: string;
  interval: string;
  currency: string;
  marketRegion: string;
  itemsJson: unknown;
  nextRunAt: Date;
  lastRunAt: Date | null;
}): RecurringInvoiceSummary {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId ?? "",
    clientName: row.client?.name ?? "—",
    status: row.status,
    interval: row.interval as RecurringInterval,
    currency: row.currency,
    marketRegion: row.marketRegion,
    nextRunAt: row.nextRunAt.toISOString(),
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    totalItems: asLineItems(row.itemsJson).length,
  };
}

export async function listRecurringInvoices(companyId: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.recurringInvoice.findMany({
    where: { companyId },
    include: { client: { select: { name: true } } },
    orderBy: { nextRunAt: "asc" },
  });
  return rows.map(mapRecurring);
}

export async function createRecurringInvoice(input: {
  companyId: string;
  clientId: string;
  name: string;
  interval: RecurringInterval;
  items: LineItemInput[];
  currency?: string;
  marketRegion?: MarketRegionId;
  nextRunAt?: string;
}) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  if (!input.clientId.trim()) return { error: "Client requis." as const };
  if (!input.name.trim()) return { error: "Nom requis." as const };
  if (!input.items.length) return { error: "Ajoutez au moins une ligne." as const };

  const nextRunAt = input.nextRunAt ? new Date(input.nextRunAt) : addInterval(new Date(), input.interval);
  if (Number.isNaN(nextRunAt.getTime())) return { error: "Date invalide." as const };

  const row = await prisma.recurringInvoice.create({
    data: {
      companyId: input.companyId,
      clientId: input.clientId,
      name: input.name.trim(),
      interval: input.interval,
      currency: input.currency?.trim() || "CAD",
      marketRegion: input.marketRegion ?? "CA-QC",
      itemsJson: input.items as object,
      nextRunAt,
    },
    include: { client: { select: { name: true } } },
  });

  return { recurringInvoice: mapRecurring(row) };
}

export async function updateRecurringInvoiceStatus(
  companyId: string,
  id: string,
  status: "active" | "paused" | "cancelled"
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  const updated = await prisma.recurringInvoice.updateMany({
    where: { id, companyId },
    data: { status },
  });
  if (updated.count === 0) return { error: "Facture récurrente introuvable." as const };
  return { ok: true as const };
}

export async function generateDueRecurringInvoices(now = new Date()) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const due = await prisma.recurringInvoice.findMany({
    where: {
      status: "active",
      nextRunAt: { lte: now },
      clientId: { not: null },
    },
    orderBy: { nextRunAt: "asc" },
  });

  const results = [];

  for (const recurring of due) {
    const items = asLineItems(recurring.itemsJson);
    if (!recurring.clientId || items.length === 0) {
      results.push({ id: recurring.id, ok: false, error: "Configuration incomplète." });
      continue;
    }

    const created = await createInvoice({
      companyId: recurring.companyId,
      clientId: recurring.clientId,
      items,
      currency: recurring.currency,
      marketRegion: recurring.marketRegion as MarketRegionId,
    });

    if ("error" in created && created.error) {
      results.push({ id: recurring.id, ok: false, error: created.error });
      continue;
    }

    await prisma.invoice.update({
      where: { id: created.invoice.id },
      data: { recurringInvoiceId: recurring.id },
    });

    await prisma.recurringInvoice.update({
      where: { id: recurring.id },
      data: {
        lastRunAt: now,
        nextRunAt: addInterval(recurring.nextRunAt, recurring.interval as RecurringInterval),
      },
    });

    results.push({ id: recurring.id, ok: true, invoiceId: created.invoice.id });
  }

  return {
    evaluated: due.length,
    generated: results.filter((result) => result.ok).length,
    results,
  };
}
