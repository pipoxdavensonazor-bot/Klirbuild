import fs from "fs";
import path from "path";
import type { Quote, QuoteStatus } from "@/types";
import { quotes as mockQuotes } from "@/lib/mock-data";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import {
  emailFromAddress,
  logEmail,
  sendEmail,
} from "@/lib/email/email-service";
import {
  quoteEmailHtml,
  quoteEmailText,
} from "@/lib/email/templates";
import { demoCompany } from "@/lib/mock-data";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "quotes.json");

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), "utf8");
  }
}

function readFileQuotes(companyId: string): Quote[] {
  ensureStore();
  try {
    const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Quote[];
    return all.filter((q) => !companyId || true);
  } catch {
    return [];
  }
}

function writeFileQuote(quote: Quote) {
  ensureStore();
  const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Quote[];
  const idx = all.findIndex((q) => q.id === quote.id);
  if (idx >= 0) all[idx] = quote;
  else all.push(quote);
  fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf8");
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
    to: clientEmail,
    subject: `Soumission ${quote.number} — ${companyName}`,
    html,
    text,
  });

  if ("error" in sent && sent.error) return { error: sent.error };

  await updateQuoteStatus(companyId, id, "sent");

  await logEmail({
    companyId,
    direction: "outbound",
    fromEmail: emailFromAddress(),
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

export async function convertQuoteToInvoice(companyId: string, id: string) {
  const quote = await getQuote(companyId, id);
  if (!quote) return { error: "Soumission introuvable." as const };
  if (quote.status !== "approved" && quote.status !== "sent") {
    return { error: "Approuvez ou envoyez la soumission avant conversion." as const };
  }

  const { createInvoiceFromQuote } = await import("@/lib/invoices/invoice-service");
  return createInvoiceFromQuote(companyId, quote);
}
