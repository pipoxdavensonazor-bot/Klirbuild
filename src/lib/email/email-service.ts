import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

import {
  getCompanyEmailContext,
} from "@/lib/email/company-email";

export type EmailDirection = "inbound" | "outbound";

export type EmailRecord = {
  id: string;
  companyId: string;
  direction: EmailDirection;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  clientId?: string;
  quoteId?: string;
  invoiceId?: string;
  providerId?: string;
  readAt?: string;
  createdAt: string;
};

function mapRow(row: {
  id: string;
  companyId: string;
  direction: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  clientId: string | null;
  quoteId: string | null;
  invoiceId: string | null;
  providerId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): EmailRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    direction: row.direction as EmailDirection,
    fromEmail: row.fromEmail,
    toEmail: row.toEmail,
    subject: row.subject,
    bodyText: row.bodyText ?? undefined,
    bodyHtml: row.bodyHtml ?? undefined,
    clientId: row.clientId ?? undefined,
    quoteId: row.quoteId ?? undefined,
    invoiceId: row.invoiceId ?? undefined,
    providerId: row.providerId ?? undefined,
    readAt: row.readAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/** @deprecated Utilisez getCompanyEmailContext(companyId).logicalFrom */
export function platformEmailFallback() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.COMPANY_INBOX_EMAIL?.trim() ||
    "billing@klirline.ca"
  );
}

export async function companyInboxAddress(companyId: string) {
  const ctx = await getCompanyEmailContext(companyId);
  return ctx.inboxEmail;
}

export async function sendEmail(input: {
  companyId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const ctx = await getCompanyEmailContext(input.companyId);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: ctx.displayFrom,
          reply_to: ctx.replyTo,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) {
        return { error: data.message || "Envoi courriel échoué" as const };
      }
      return { providerId: data.id, delivered: true as const, emailContext: ctx };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Réseau Resend indisponible";
      return { error: message };
    }
  }

  return {
    delivered: false as const,
    simulated: true as const,
    emailContext: ctx,
    mailto: `mailto:${encodeURIComponent(input.to)}?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(input.text || "")}`,
  };
}

export async function logEmail(record: Omit<EmailRecord, "id" | "createdAt"> & { id?: string }) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const row = await prisma.emailMessage.create({
    data: {
      id: record.id && !record.id.startsWith("em_") ? record.id : undefined,
      companyId: record.companyId,
      direction: record.direction,
      fromEmail: record.fromEmail,
      toEmail: record.toEmail,
      subject: record.subject,
      bodyText: record.bodyText,
      bodyHtml: record.bodyHtml,
      clientId: record.clientId,
      quoteId: record.quoteId,
      invoiceId: record.invoiceId,
      providerId: record.providerId,
      readAt: record.readAt ? new Date(record.readAt) : null,
    },
  });
  return mapRow(row);
}

export async function listEmails(companyId: string, clientId?: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.emailMessage.findMany({
    where: { companyId, ...(clientId ? { clientId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const mapped = rows.map(mapRow);

  const { hydrateInboundEmailBodies } = await import(
    "@/lib/email/inbound-service"
  );
  await hydrateInboundEmailBodies(mapped);

  return mapped;
}

export async function markEmailRead(companyId: string, emailId: string) {
  if (!hasDatabase()) return false;
  const row = await prisma.emailMessage.updateMany({
    where: { id: emailId, companyId },
    data: { readAt: new Date() },
  });
  return row.count > 0;
}

export async function sendClientMessage(input: {
  companyId: string;
  clientId: string;
  subject: string;
  body: string;
}) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) return { error: "Objet requis." as const };
  if (!body) return { error: "Message requis." as const };
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const client = await prisma.client.findFirst({
    where: { id: input.clientId, companyId: input.companyId },
    include: { company: { select: { name: true } } },
  });
  if (!client) return { error: "Client introuvable." as const };

  const clientEmail = client.email?.trim() ?? "";
  const clientName = client.name;
  const companyName = client.company.name;

  if (!clientEmail) {
    return { error: "Le client n'a pas de courriel. Ajoutez-le dans le profil." as const };
  }

  const html = `<p>${body.replace(/\n/g, "<br/>")}</p><p style="color:#64748b;font-size:12px;margin-top:24px;">— ${companyName}</p>`;
  const sent = await sendEmail({
    companyId: input.companyId,
    to: clientEmail,
    subject,
    html,
    text: body,
  });

  if ("error" in sent && sent.error) return { error: sent.error };

  const emailCtx = await getCompanyEmailContext(input.companyId);
  const logged = await logEmail({
    companyId: input.companyId,
    direction: "outbound",
    fromEmail: emailCtx.logicalFrom,
    toEmail: clientEmail,
    subject,
    bodyText: body,
    bodyHtml: html,
    clientId: input.clientId,
    providerId: "providerId" in sent ? sent.providerId : undefined,
  });

  if ("error" in logged) return { error: logged.error };

  return {
    ok: true,
    delivered: "delivered" in sent ? sent.delivered : false,
    simulated: "simulated" in sent ? sent.simulated : false,
    mailto: "mailto" in sent ? sent.mailto : undefined,
    to: clientEmail,
    clientName,
  };
}

export async function recordInboundEmail(input: {
  companyId: string;
  from: string;
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  clientId?: string;
  providerId?: string;
}) {
  const result = await logEmail({
    companyId: input.companyId,
    direction: "inbound",
    fromEmail: input.from,
    toEmail: input.to,
    subject: input.subject,
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml,
    clientId: input.clientId,
    providerId: input.providerId,
  });
  if ("error" in result) return result;
  return result;
}
