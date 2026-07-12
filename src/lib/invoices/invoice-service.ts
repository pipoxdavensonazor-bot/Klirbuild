import fs from "fs";
import path from "path";
import type { Invoice, InvoiceStatus, Quote } from "@/types";
import { invoices as mockInvoices } from "@/lib/mock-data";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { getCompanyEmailContext } from "@/lib/email/company-email";
import {
  logEmail,
  sendEmail,
} from "@/lib/email/email-service";
import {
  invoiceEmailHtml,
  invoiceEmailText,
} from "@/lib/email/templates";
import { demoCompany } from "@/lib/mock-data";
import { computeDocumentTax, type LineItemInput } from "@/lib/tax/document-tax";
import type { MarketRegionId } from "@/lib/markets/regions";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "invoices.json");

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

function readFileInvoices(): Invoice[] {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Invoice[];
  } catch {
    return [];
  }
}

function writeFileInvoice(invoice: Invoice) {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return;
    const all = readFileInvoices();
    const idx = all.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) all[idx] = invoice;
    else all.push(invoice);
    fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf8");
  } catch {
    /* ignore on serverless */
  }
}

function mapDbInvoice(row: {
  id: string;
  number: string;
  clientId: string | null;
  status: string;
  total: { toNumber(): number } | number;
  currency: string;
  issueDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  client?: { name: string } | null;
}): Invoice {
  return {
    id: row.id,
    number: row.number,
    clientId: row.clientId ?? "",
    clientName: row.client?.name ?? "—",
    status: row.status as InvoiceStatus,
    total: dec(row.total),
    currency: row.currency,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    dueDate: row.dueDate?.toISOString().slice(0, 10) ?? "",
    paidAt: row.paidAt?.toISOString().slice(0, 10),
  };
}

function mergeInvoices(api: Invoice[]): Invoice[] {
  const file = readFileInvoices();
  const seen = new Set<string>();
  const out: Invoice[] = [];
  for (const i of [...file, ...api, ...mockInvoices]) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    out.push(i);
  }
  return out;
}

export async function listInvoices(companyId: string): Promise<Invoice[]> {
  if (hasDatabase()) {
    const rows = await prisma.invoice.findMany({
      where: { companyId },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return mergeInvoices(rows.map(mapDbInvoice));
  }
  return mergeInvoices([]);
}

export async function getInvoice(companyId: string, id: string) {
  const all = await listInvoices(companyId);
  return all.find((i) => i.id === id) ?? null;
}

export async function getInvoiceDetail(companyId: string, id: string) {
  if (hasDatabase()) {
    const row = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        client: { select: { name: true } },
        items: { orderBy: { id: "asc" } },
      },
    });
    if (!row) return null;
    return {
      invoice: mapDbInvoice(row),
      items: row.items.map((item) => ({
        description: item.description,
        quantity: dec(item.quantity),
        unitPrice: dec(item.unitPrice),
      })),
    };
  }

  const invoice = await getInvoice(companyId, id);
  if (!invoice) return null;
  return {
    invoice,
    items: [{ description: "Services", quantity: 1, unitPrice: invoice.total }],
  };
}

export async function updateInvoice(
  companyId: string,
  id: string,
  input: {
    clientId?: string;
    items?: LineItemInput[];
    marketRegion?: MarketRegionId;
  }
) {
  const existing = await getInvoice(companyId, id);
  if (!existing) return { error: "Facture introuvable." as const };
  if (existing.status !== "draft") {
    return { error: "Seules les factures en brouillon peuvent être modifiées." as const };
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
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.update({
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
    const updated = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: { client: { select: { name: true } } },
    });
    if (!updated) return { error: "Facture introuvable." as const };
    return { invoice: mapDbInvoice(updated), tax: breakdown };
  }

  const next: Invoice = {
    ...existing,
    ...(input.clientId ? { clientId: input.clientId } : {}),
    total: breakdown.total,
    currency: breakdown.currency,
  };
  writeFileInvoice(next);
  return { invoice: next, tax: breakdown };
}

export async function updateInvoiceStatus(
  companyId: string,
  id: string,
  status: InvoiceStatus
) {
  if (hasDatabase()) {
    const row = await prisma.invoice.updateMany({
      where: { id, companyId },
      data: { status },
    });
    if (row.count === 0) return { error: "Facture introuvable." as const };
    const updated = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: { client: { select: { name: true, email: true } } },
    });
    if (!updated) return { error: "Facture introuvable." as const };
    return { invoice: mapDbInvoice(updated), clientEmail: updated.client?.email };
  }

  const invoice = await getInvoice(companyId, id);
  if (!invoice) return { error: "Facture introuvable." as const };
  const next = { ...invoice, status };
  writeFileInvoice(next);
  const { clients } = await import("@/lib/mock-data");
  const mockClient = clients.find((c) => c.id === invoice.clientId);
  return { invoice: next, clientEmail: mockClient?.email };
}

function appUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

export async function sendInvoiceToClient(companyId: string, id: string) {
  const invoice = await getInvoice(companyId, id);
  if (!invoice) return { error: "Facture introuvable." as const };

  const { clients } = await import("@/lib/mock-data");
  let clientEmail = clients.find((c) => c.id === invoice.clientId)?.email;
  let clientName = invoice.clientName;
  let companyName = demoCompany.name;

  if (hasDatabase()) {
    const row = await prisma.invoice.findFirst({
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

  const html = invoiceEmailHtml({
    companyName,
    clientName,
    invoiceNumber: invoice.number,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    appUrl: appUrl(),
  });
  const text = invoiceEmailText({
    companyName,
    clientName,
    invoiceNumber: invoice.number,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
  });

  const sent = await sendEmail({
    companyId,
    to: clientEmail,
    subject: `Facture ${invoice.number} — ${companyName}`,
    html,
    text,
  });

  if ("error" in sent && sent.error) return { error: sent.error };

  const emailCtx = await getCompanyEmailContext(companyId);
  await updateInvoiceStatus(companyId, id, "sent");

  await logEmail({
    companyId,
    direction: "outbound",
    fromEmail: emailCtx.logicalFrom,
    toEmail: clientEmail,
    subject: `Facture ${invoice.number} — ${companyName}`,
    bodyText: text,
    bodyHtml: html,
    clientId: invoice.clientId,
    invoiceId: id,
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

export async function createInvoice(input: {
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
            description: input.description?.trim() || "Services professionnels",
            quantity: 1,
            unitPrice: Number(input.total) || 0,
          },
        ];

  const breakdown = computeDocumentTax(lineItems, input.marketRegion ?? "CA-QC");
  if (breakdown.subtotal <= 0) {
    return { error: "Ajoutez au moins une ligne avec un montant." as const };
  }

  const year = new Date().getFullYear();
  const due = new Date();
  due.setDate(due.getDate() + 30);
  const currency = input.currency?.trim() || breakdown.currency;

  if (hasDatabase()) {
    const count = await prisma.invoice.count({ where: { companyId: input.companyId } });
    const number = `INV-${year}-${String(count + 1).padStart(3, "0")}`;
    const row = await prisma.invoice.create({
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
        dueDate: due,
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
    return { invoice: mapDbInvoice(row), tax: breakdown };
  }

  const { clients } = await import("@/lib/mock-data");
  const mockClient = clients.find((c) => c.id === input.clientId);
  const invoice: Invoice = {
    id: `inv_${Date.now()}`,
    number: `INV-${year}-${String(readFileInvoices().length + 1).padStart(3, "0")}`,
    clientId: input.clientId,
    clientName: mockClient?.name ?? "—",
    status: "draft",
    total: breakdown.total,
    currency,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
  };
  writeFileInvoice(invoice);
  return { invoice, tax: breakdown };
}

export async function createInvoiceFromQuote(companyId: string, quote: Quote) {
  const number = quote.number.replace(/^Q-/, "INV-");
  const due = new Date();
  due.setDate(due.getDate() + 30);

  if (hasDatabase()) {
    const existing = await prisma.invoice.findFirst({
      where: { companyId, number },
    });
    if (existing) return { error: "Facture déjà créée pour cette soumission." as const };

    const row = await prisma.invoice.create({
      data: {
        companyId,
        clientId: quote.clientId || null,
        number,
        status: "draft",
        currency: quote.currency,
        subtotal: quote.total,
        tax: 0,
        discount: 0,
        total: quote.total,
        dueDate: due,
      },
      include: { client: { select: { name: true } } },
    });
    return { invoice: mapDbInvoice(row) };
  }

  const invoice: Invoice = {
    id: `inv_${Date.now()}`,
    number,
    clientId: quote.clientId,
    clientName: quote.clientName,
    status: "draft",
    total: quote.total,
    currency: quote.currency,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
  };
  writeFileInvoice(invoice);
  return { invoice };
}
