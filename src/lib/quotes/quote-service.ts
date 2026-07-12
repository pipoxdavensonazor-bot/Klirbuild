import fs from "fs";
import path from "path";
import type { Quote, QuoteStatus } from "@/types";
import { quotes as mockQuotes } from "@/lib/mock-data";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { getCompanyEmailContext } from "@/lib/email/company-email";
import {
  logEmail,
  sendEmail,
} from "@/lib/email/email-service";
import {
  quoteEmailHtml,
  quoteEmailText,
} from "@/lib/email/templates";
import { demoCompany } from "@/lib/mock-data";
import { computeDocumentTax, type LineItemInput } from "@/lib/tax/document-tax";
import type { MarketRegionId } from "@/lib/markets/regions";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "quotes.json");

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function ensureStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) {
      fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), "utf8");
    }
  } catch {
    /* serverless: read-only filesystem */
  }
}

function readFileQuotes(companyId: string): Quote[] {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return [];
    const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Quote[];
    return all.filter((q) => !companyId || true);
  } catch {
    return [];
  }
}

function writeFileQuote(quote: Quote) {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return;
    const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Quote[];
    const idx = all.findIndex((q) => q.id === quote.id);
    if (idx >= 0) all[idx] = quote;
    else all.push(quote);
    fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf8");
  } catch {
    /* ignore on serverless */
  }
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

function mergeQuotes(companyId: string, api: Quote[]): Quote[] {
  const file = readFileQuotes(companyId);
  const mock = mockQuotes;
  const seen = new Set<string>();
  const out: Quote[] = [];
  for (const q of [...file, ...api, ...mock]) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

export async function listQuotes(companyId: string): Promise<Quote[]> {
  if (hasDatabase()) {
    const rows = await prisma.quote.findMany({
      where: { companyId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return mergeQuotes(companyId, rows.map(mapDbQuote));
  }
  return mergeQuotes(companyId, []);
}

export async function getQuote(companyId: string, id: string) {
  const all = await listQuotes(companyId);
  return all.find((q) => q.id === id) ?? null;
}

export async function getQuoteDetail(companyId: string, id: string) {
  if (hasDatabase()) {
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
        quantity: dec(item.quantity),
        unitPrice: dec(item.unitPrice),
      })),
    };
  }

  const quote = await getQuote(companyId, id);
  if (!quote) return null;
  return {
    quote,
    items: [{ description: "Services", quantity: 1, unitPrice: quote.total }],
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

  if (hasDatabase()) {
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

  const next: Quote = {
    ...existing,
    ...(input.clientId ? { clientId: input.clientId } : {}),
    total: breakdown.total,
    currency: breakdown.currency,
  };
  writeFileQuote(next);
  return { quote: next, tax: breakdown };
}

export async function updateQuoteStatus(
  companyId: string,
  id: string,
  status: QuoteStatus
) {
  if (hasDatabase()) {
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

  const quote = await getQuote(companyId, id);
  if (!quote) return { error: "Soumission introuvable." as const };
  const next = { ...quote, status };
  writeFileQuote(next);
  const { clients } = await import("@/lib/mock-data");
  const mockClient = clients.find((c) => c.id === quote.clientId);
  return { quote: next, clientEmail: mockClient?.email };
}

function appUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

export async function sendQuoteToClient(companyId: string, id: string) {
  const quote = await getQuote(companyId, id);
  if (!quote) return { error: "Soumission introuvable." as const };

  const { clients } = await import("@/lib/mock-data");
  let clientEmail = clients.find((c) => c.id === quote.clientId)?.email;
  let clientName = quote.clientName;
  let companyName = demoCompany.name;

  if (hasDatabase()) {
    const row = await prisma.quote.findFirst({
      where: { id, companyId },
      include: { client: true, company: true },
    });
    clientEmail = row?.client?.email ?? clientEmail;
    clientName = row?.client?.name ?? clientName;
    companyName = row?.company?.name ?? companyName;
  }

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

  if (hasDatabase()) {
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

  const { clients } = await import("@/lib/mock-data");
  const mockClient = clients.find((c) => c.id === input.clientId);
  const quote: Quote = {
    id: `q_${Date.now()}`,
    number: `Q-${year}-${String(readFileQuotes(input.companyId).length + 1).padStart(3, "0")}`,
    clientId: input.clientId,
    clientName: mockClient?.name ?? "—",
    status: "draft",
    total: breakdown.total,
    currency,
    issueDate: new Date().toISOString().slice(0, 10),
    validUntil: validUntil.toISOString().slice(0, 10),
  };
  writeFileQuote(quote);
  return { quote, tax: breakdown };
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
