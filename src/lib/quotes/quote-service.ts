import type { Quote, QuoteStatus } from "@/types";
import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import { getCompanyEmailContext } from "@/lib/email/company-email";
import { logEmail, sendEmail } from "@/lib/email/email-service";
import { quoteEmailHtml, quoteEmailText } from "@/lib/email/templates";
import { computeDocumentTax, type LineItemInput } from "@/lib/tax/document-tax";
import type { MarketRegionId } from "@/lib/markets/regions";

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function mapDbQuote(row: {
  id: string;
  number: string;
  clientId: string | null;
  status: string;
  total: { toNumber(): number } | number;
  currency: string;
  issueDate: Date;
  validUntil: Date | null;
  client?: { name: string } | null;
}): Quote {
  return {
    id: row.id,
    number: row.number,
    clientId: row.clientId ?? "",
    clientName: row.client?.name ?? "—",
    status: row.status as QuoteStatus,
    total: dec(row.total),
    currency: row.currency,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    validUntil: row.validUntil?.toISOString().slice(0, 10) ?? "",
  };
}

export async function listQuotes(companyId: string): Promise<Quote[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.quote.findMany({
    where: { companyId },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDbQuote);
}

export async function getQuote(companyId: string, id: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.quote.findFirst({
    where: { id, companyId },
    include: { client: { select: { name: true } } },
  });
  return row ? mapDbQuote(row) : null;
}

export async function getQuoteDetail(companyId: string, id: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.quote.findFirst({
    where: { id, companyId },
    include: {
      client: { select: { name: true } },
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!row) return null;
  return {
    quote: mapDbQuote(row),
    items: row.items.map((item) => ({
      description: item.description,
      unit: item.unit ?? undefined,
      quantity: dec(item.quantity),
      unitPrice: dec(item.unitPrice),
    })),
  };
}

export async function updateQuote(
  companyId: string,
  id: string,
  input: {
    clientId?: string;
    items?: LineItemInput[];
    marketRegion?: MarketRegionId;
  }
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const existing = await getQuote(companyId, id);
  if (!existing) return { error: "Soumission introuvable." as const };
  if (existing.status !== "draft") {
    return { error: "Seules les soumissions en brouillon peuvent être modifiées." as const };
  }

  const lineItems: LineItemInput[] =
    input.items && input.items.length > 0
      ? input.items
      : [{ description: "Services", quantity: 1, unitPrice: existing.total }];

  const breakdown = computeDocumentTax(lineItems, input.marketRegion ?? "CA-QC");
  if (breakdown.subtotal <= 0) {
    return { error: "Ajoutez au moins une ligne avec un montant." as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id },
      data: {
        ...(input.clientId ? { clientId: input.clientId } : {}),
        currency: breakdown.currency,
        subtotal: breakdown.subtotal,
        tax: breakdown.taxTotal,
        total: breakdown.total,
        items: {
          create: breakdown.items.map((item) => ({
            description: item.description,
            unit: item.unit ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
    });
  });
  const updated = await prisma.quote.findFirst({
    where: { id, companyId },
    include: { client: { select: { name: true } } },
  });
  if (!updated) return { error: "Soumission introuvable." as const };
  return { quote: mapDbQuote(updated), tax: breakdown };
}

export async function updateQuoteStatus(
  companyId: string,
  id: string,
  status: QuoteStatus
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const row = await prisma.quote.updateMany({
    where: { id, companyId },
    data: { status },
  });
  if (row.count === 0) return { error: "Soumission introuvable." as const };
  const updated = await prisma.quote.findFirst({
    where: { id, companyId },
    include: { client: { select: { name: true, email: true } } },
  });
  if (!updated) return { error: "Soumission introuvable." as const };
  return { quote: mapDbQuote(updated), clientEmail: updated.client?.email };
}

function appUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

export async function sendQuoteToClient(companyId: string, id: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const row = await prisma.quote.findFirst({
    where: { id, companyId },
    include: { client: true, company: true },
  });
  if (!row) return { error: "Soumission introuvable." as const };

  const quote = mapDbQuote(row);
  const clientEmail = row.client?.email?.trim();
  const clientName = row.client?.name ?? quote.clientName;
  const companyName = row.company?.name ?? "Votre entreprise";

  if (!clientEmail) {
    return { error: "Le client n'a pas de courriel. Ajoutez-le dans Clients." as const };
  }

  const html = quoteEmailHtml({
    companyName,
    clientName,
    quoteNumber: quote.number,
    total: quote.total,
    currency: quote.currency,
    validUntil: quote.validUntil,
    appUrl: appUrl(),
  });
  const text = quoteEmailText({
    companyName,
    clientName,
    quoteNumber: quote.number,
    total: quote.total,
    currency: quote.currency,
    validUntil: quote.validUntil,
  });

  const sent = await sendEmail({
    companyId,
    to: clientEmail,
    subject: `Soumission ${quote.number} — ${companyName}`,
    html,
    text,
  });

  if ("error" in sent && sent.error) return { error: sent.error };

  const emailCtx = await getCompanyEmailContext(companyId);
  await updateQuoteStatus(companyId, id, "sent");

  await logEmail({
    companyId,
    direction: "outbound",
    fromEmail: emailCtx.logicalFrom,
    toEmail: clientEmail,
    subject: `Soumission ${quote.number} — ${companyName}`,
    bodyText: text,
    bodyHtml: html,
    clientId: quote.clientId,
    quoteId: id,
    providerId: "providerId" in sent ? sent.providerId : undefined,
  });

  return {
    ok: true,
    delivered: "delivered" in sent ? sent.delivered : false,
    simulated: "simulated" in sent ? sent.simulated : false,
    mailto: "mailto" in sent ? sent.mailto : undefined,
    to: clientEmail,
  };
}

export async function createQuote(input: {
  companyId: string;
  clientId: string;
  items?: LineItemInput[];
  total?: number;
  description?: string;
  currency?: string;
  marketRegion?: MarketRegionId;
}) {
  if (!input.clientId?.trim()) return { error: "Client requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const lineItems: LineItemInput[] =
    input.items && input.items.length > 0
      ? input.items
      : [
          {
            description: input.description?.trim() || "Soumission de services",
            quantity: 1,
            unitPrice: Number(input.total) || 0,
          },
        ];

  const breakdown = computeDocumentTax(lineItems, input.marketRegion ?? "CA-QC");
  if (breakdown.subtotal <= 0) {
    return { error: "Ajoutez au moins une ligne avec un montant." as const };
  }

  const year = new Date().getFullYear();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);
  const currency = input.currency?.trim() || breakdown.currency;

  const count = await prisma.quote.count({ where: { companyId: input.companyId } });
  const number = `Q-${year}-${String(count + 1).padStart(3, "0")}`;
  const row = await prisma.quote.create({
    data: {
      companyId: input.companyId,
      clientId: input.clientId,
      number,
      status: "draft",
      currency,
      subtotal: breakdown.subtotal,
      tax: breakdown.taxTotal,
      discount: 0,
      total: breakdown.total,
      validUntil,
      items: {
        create: breakdown.items.map((item) => ({
          description: item.description,
          unit: item.unit ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      },
    },
    include: { client: { select: { name: true } } },
  });
  return { quote: mapDbQuote(row), tax: breakdown };
}

export async function convertQuoteToInvoice(companyId: string, id: string) {
  const quote = await getQuote(companyId, id);
  if (!quote) return { error: "Soumission introuvable." as const };
  if (quote.status !== "approved" && quote.status !== "sent") {
    return { error: "Approuvez ou envoyez la soumission avant conversion." as const };
  }

  const { createInvoiceFromQuote } = await import("@/lib/invoices/invoice-service");
  return createInvoiceFromQuote(companyId, quote);
}
