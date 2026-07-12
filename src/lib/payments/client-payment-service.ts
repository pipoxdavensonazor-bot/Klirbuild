import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { getCompanyEmailContext } from "@/lib/email/company-email";
import { logEmail, sendEmail } from "@/lib/email/email-service";
import { receiptEmailHtml, receiptEmailText } from "@/lib/email/templates";
import { formatCurrency } from "@/lib/utils";

export type ClientPaymentDto = {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  clientId?: string;
  clientName: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
};

function mapPayment(row: {
  id: string;
  amount: { toNumber(): number };
  currency: string;
  status: string;
  method: string | null;
  createdAt: Date;
  invoice?: { id: string; number: string; clientId: string | null; client?: { name: string } | null } | null;
}): ClientPaymentDto {
  return {
    id: row.id,
    invoiceId: row.invoice?.id,
    invoiceNumber: row.invoice?.number,
    clientId: row.invoice?.clientId ?? undefined,
    clientName: row.invoice?.client?.name ?? "—",
    amount: row.amount.toNumber(),
    currency: row.currency,
    method: row.method ?? "manual",
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listClientPayments(companyId: string, clientId?: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.payment.findMany({
    where: {
      companyId,
      ...(clientId
        ? { invoice: { clientId } }
        : {}),
    },
    include: {
      invoice: {
        select: {
          id: true,
          number: true,
          clientId: true,
          client: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(mapPayment);
}

export async function recordClientPayment(input: {
  companyId: string;
  clientId: string;
  invoiceId?: string;
  amount: number;
  method?: string;
  projectName?: string;
  sendReceipt?: boolean;
}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Montant invalide." as const };
  }

  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis." as const };
  }

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, companyId: input.companyId },
  });
  if (!client) return { error: "Client introuvable." as const };

  let invoice = input.invoiceId
    ? await prisma.invoice.findFirst({
        where: { id: input.invoiceId, companyId: input.companyId },
        include: { client: true, company: true },
      })
    : null;

  if (!invoice) {
    const openInvoice = await prisma.invoice.findFirst({
      where: { companyId: input.companyId, clientId: input.clientId, status: { not: "paid" } },
      orderBy: { createdAt: "desc" },
      include: { client: true, company: true },
    });
    invoice = openInvoice;
  }

  const row = await prisma.payment.create({
    data: {
      companyId: input.companyId,
      invoiceId: invoice?.id,
      amount,
      currency: invoice?.currency ?? "CAD",
      status: "succeeded",
      method: input.method ?? "virement",
    },
    include: {
      invoice: {
        select: {
          id: true,
          number: true,
          clientId: true,
          client: { select: { name: true, email: true } },
          company: { select: { name: true } },
        },
      },
    },
  });

  if (invoice) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "paid", paidAt: new Date() },
    });
  }

  const payment = mapPayment(row);
  let receipt: { delivered?: boolean; to?: string; error?: string } | undefined;

  if (input.sendReceipt !== false && client.email) {
    const companyName = invoice?.company?.name ?? "Votre entreprise";
    const html = receiptEmailHtml({
      companyName,
      clientName: client.name,
      amount,
      currency: payment.currency,
      invoiceNumber: invoice?.number,
      projectName: input.projectName,
      method: payment.method,
      paidAt: payment.createdAt,
    });
    const text = receiptEmailText({
      companyName,
      clientName: client.name,
      amount,
      currency: payment.currency,
      invoiceNumber: invoice?.number,
      projectName: input.projectName,
      method: payment.method,
      paidAt: payment.createdAt,
    });
    const sent = await sendEmail({
      companyId: input.companyId,
      to: client.email,
      subject: `Reçu de paiement — ${companyName}`,
      html,
      text,
    });
    if ("error" in sent && sent.error) {
      receipt = { error: sent.error };
    } else {
      receipt = { delivered: true, to: client.email };
      const ctx = await getCompanyEmailContext(input.companyId);
      try {
        await logEmail({
          companyId: input.companyId,
          direction: "outbound",
          fromEmail: ctx.logicalFrom,
          toEmail: client.email,
          subject: `Reçu de paiement — ${companyName}`,
          bodyText: text,
          bodyHtml: html,
          clientId: input.clientId,
          invoiceId: invoice?.id,
        });
      } catch {
        /* ignore */
      }
    }
  }

  return { payment, receipt };
}
