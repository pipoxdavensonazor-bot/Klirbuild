import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import { getCompanyEmailContext } from "@/lib/email/company-email";
import { logEmail, sendEmail } from "@/lib/email/email-service";
import { invoiceEmailHtml, invoiceEmailText } from "@/lib/email/templates";
import { createInvoiceStripeCheckout } from "@/lib/payments/stripe-invoice-checkout";
import { isStripeConfigured } from "@/lib/stripe";
import { computeDocumentTax, type LineItemInput } from "@/lib/tax/document-tax";
import type { MarketRegionId } from "@/lib/markets/regions";
import type { Invoice, InvoiceStatus, Quote } from "@/types";

function appUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

function dec(v: { toNumber(): number } | number) {
  return typeof v === "number" ? v : v.toNumber();
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

export async function listInvoices(companyId: string): Promise<Invoice[]> {
  if (!hasDatabase()) return [];
  const rows = await prisma.invoice.findMany({
    where: { companyId },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDbInvoice);
}

export async function getInvoice(companyId: string, id: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { client: { select: { name: true } } },
  });
  return row ? mapDbInvoice(row) : null;
}

export async function getInvoiceDetail(companyId: string, id: string) {
  if (!hasDatabase()) return null;
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
      unit: item.unit ?? undefined,
      quantity: dec(item.quantity),
      unitPrice: dec(item.unitPrice),
    })),
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
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

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
            unit: item.unit ?? null,
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

export async function updateInvoiceStatus(
  companyId: string,
  id: string,
  status: InvoiceStatus
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

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

export async function sendInvoiceToClient(companyId: string, id: string) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const row = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { client: true, company: true },
  });
  if (!row) return { error: "Facture introuvable." as const };

  const invoice = mapDbInvoice(row);
  const clientEmail = row.client?.email?.trim();
  const clientName = row.client?.name ?? invoice.clientName;
  const companyName = row.company?.name ?? "Votre entreprise";

  if (!clientEmail) {
    return { error: "Le client n'a pas de courriel. Ajoutez-le dans Clients." as const };
  }

  let paymentUrl: string | undefined;
  if (isStripeConfigured() && invoice.status !== "paid") {
    const checkout = await createInvoiceStripeCheckout(companyId, id);
    if ("url" in checkout && checkout.url) {
      paymentUrl = checkout.url;
    }
  }

  const html = invoiceEmailHtml({
    companyName,
    clientName,
    invoiceNumber: invoice.number,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    appUrl: appUrl(),
    paymentUrl,
  });
  const text = invoiceEmailText({
    companyName,
    clientName,
    invoiceNumber: invoice.number,
    total: invoice.total,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    paymentUrl,
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
    paymentUrl,
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
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

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
          unit: item.unit ?? null,
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

export async function createInvoiceFromQuote(companyId: string, quote: Quote) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const number = quote.number.replace(/^Q-/, "INV-");
  const due = new Date();
  due.setDate(due.getDate() + 30);

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
