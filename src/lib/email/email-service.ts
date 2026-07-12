import fs from "fs";
import path from "path";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";

import {
  getCompanyEmailContext,
  type CompanyEmailContext,
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

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "emails.json");

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

function readFileEmails(companyId: string): EmailRecord[] {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return [];
    const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as EmailRecord[];
    return all.filter((e) => e.companyId === companyId);
  } catch {
    return [];
  }
}

function writeFileEmail(record: EmailRecord) {
  try {
    ensureStore();
    if (!fs.existsSync(STORE_PATH)) return;
    const all = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as EmailRecord[];
    all.unshift(record);
    fs.writeFileSync(STORE_PATH, JSON.stringify(all, null, 2), "utf8");
  } catch {
    /* ignore on serverless */
  }
}

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
  const full: EmailRecord = {
    id: record.id ?? `em_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...record,
  };

  if (hasDatabase()) {
    const row = await prisma.emailMessage.create({
      data: {
        id: full.id.startsWith("em_") ? undefined : full.id,
        companyId: full.companyId,
        direction: full.direction,
        fromEmail: full.fromEmail,
        toEmail: full.toEmail,
        subject: full.subject,
        bodyText: full.bodyText,
        bodyHtml: full.bodyHtml,
        clientId: full.clientId,
        quoteId: full.quoteId,
        invoiceId: full.invoiceId,
        providerId: full.providerId,
        readAt: full.readAt ? new Date(full.readAt) : null,
      },
    });
    return mapRow(row);
  }

  try {
    writeFileEmail(full);
  } catch {
    /* ignore on serverless */
  }
  return full;
}

export async function listEmails(companyId: string, clientId?: string) {
  const demoSeed = await getDemoInboxSeed(companyId);

  if (hasDatabase()) {
    const rows = await prisma.emailMessage.findMany({
      where: { companyId, ...(clientId ? { clientId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const mapped = rows.map(mapRow);
    if (mapped.length === 0 && !clientId) return demoSeed;
    return mapped;
  }

  const fileRows = readFileEmails(companyId).filter((e) =>
    clientId ? e.clientId === clientId : true
  );
  const merged = [...fileRows, ...demoSeed.filter((d) => !fileRows.some((f) => f.id === d.id))];
  return clientId ? merged.filter((e) => e.clientId === clientId) : merged;
}

export async function markEmailRead(companyId: string, emailId: string) {
  if (hasDatabase()) {
    const row = await prisma.emailMessage.updateMany({
      where: { id: emailId, companyId },
      data: { readAt: new Date() },
    });
    return row.count > 0;
  }
  return true;
}

async function getDemoInboxSeed(companyId: string): Promise<EmailRecord[]> {
  const ctx = await getCompanyEmailContext(companyId);
  return [
    {
      id: "em_demo_1",
      companyId,
      direction: "inbound",
      fromEmail: "billing@nordicfacilities.com",
      toEmail: ctx.inboxEmail,
      subject: "Re: Soumission Q-2026-014 — questions",
      bodyText: "Bonjour, pouvez-vous confirmer les délais pour le lot peinture?",
      clientId: "cli_1",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "em_demo_2",
      companyId,
      direction: "outbound",
      fromEmail: ctx.logicalFrom,
      toEmail: "admin@harbourdental.ca",
      subject: `Facture INV-2026-094 — ${ctx.companyName}`,
      bodyText: "Veuillez trouver ci-joint votre facture.",
      clientId: "cli_2",
      invoiceId: "inv_2",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

export async function recordInboundEmail(input: {
  companyId: string;
  from: string;
  to: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  clientId?: string;
}) {
  return logEmail({
    companyId: input.companyId,
    direction: "inbound",
    fromEmail: input.from,
    toEmail: input.to,
    subject: input.subject,
    bodyText: input.bodyText,
    bodyHtml: input.bodyHtml,
    clientId: input.clientId,
  });
}
