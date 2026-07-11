import fs from "fs";
import path from "path";
import type { Invoice, InvoiceStatus, Quote } from "@/types";
import { invoices as mockInvoices } from "@/lib/mock-data";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import {
  emailFromAddress,
  logEmail,
  sendEmail,
} from "@/lib/email/email-service";
import {
  invoiceEmailHtml,
  invoiceEmailText,
} from "@/lib/email/templates";
import { demoCompany } from "@/lib/mock-data";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "invoices.json");

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2), "utf8");
  }
}

function readFileInvoices(): Invoice[] {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Invoice[];
  } catch {
    return [];
  }
}

function writeFileInvoice(invoice: Invoice) {
  ensureStore();
  const all = readFileInvoices();
  const idx = all.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) all[idx] = invoice;
  else all.push(invoice);
  fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf8");
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
    to: clientEmail,
    subject: `Facture ${invoice.number} — ${companyName}`,
    html,
    text,
  });

  if ("error" in sent && sent.error) return { error: sent.error };

  await updateInvoiceStatus(companyId, id, "sent");

  await logEmail({
    companyId,
    direction: "outbound",
    fromEmail: emailFromAddress(),
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
