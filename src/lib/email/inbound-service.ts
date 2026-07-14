import crypto from "crypto";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { recordInboundEmail } from "@/lib/email/email-service";

export type ResendReceivedEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
};

function normalizeAddress(raw: string) {
  const trimmed = raw.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match ? match[1] : trimmed).toLowerCase();
}

export function verifyResendWebhook(
  payload: string,
  headers: {
    "svix-id"?: string | null;
    "svix-timestamp"?: string | null;
    "svix-signature"?: string | null;
  }
) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const svixId = headers["svix-id"];
  const svixTimestamp = headers["svix-timestamp"];
  const svixSignature = headers["svix-signature"];
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const secretPart = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(secretPart, "base64");
  } catch {
    return false;
  }

  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");
  const parts = svixSignature.split(" ");
  for (const part of parts) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    } catch {
      /* continue */
    }
  }
  return false;
}

async function resolveCompanyIdForRecipients(recipients: string[]) {
  const addresses = recipients.map(normalizeAddress).filter(Boolean);
  if (!addresses.length) return null;

  const companies = await prisma.company.findMany({
    select: { id: true, inboxEmail: true, email: true, emailFrom: true },
  });

  for (const addr of addresses) {
    const hit = companies.find((c) => {
      const candidates = [c.inboxEmail, c.email, c.emailFrom]
        .filter(Boolean)
        .map((e) => normalizeAddress(e!));
      return candidates.includes(addr);
    });
    if (hit) return hit.id;
  }
  return null;
}

async function resolveClientId(companyId: string, fromEmail: string) {
  const normalized = normalizeAddress(fromEmail);
  const client = await prisma.client.findFirst({
    where: {
      companyId,
      deletedAt: null,
      email: { equals: normalized, mode: "insensitive" },
    },
    select: { id: true },
  });
  return client?.id;
}

async function fetchReceivedEmailContent(emailId: string): Promise<{
  text?: string;
  html?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return {};

  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return {};
  const data = (await res.json().catch(() => ({}))) as {
    text?: string | null;
    html?: string | null;
  };
  return {
    text: data.text ?? undefined,
    html: data.html ?? undefined,
  };
}

export async function handleResendInboundEvent(event: ResendReceivedEvent) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis pour enregistrer les courriels entrants." as const };
  }
  if (event.type !== "email.received" || !event.data) {
    return { ok: true as const, skipped: true as const };
  }

  const emailId = event.data.email_id;
  const from = event.data.from ?? "unknown@unknown";
  const toList = event.data.to ?? [];
  const subject = event.data.subject?.trim() || "(sans objet)";

  if (!toList.length) {
    return { error: "Destinataire manquant dans l'événement Resend." as const };
  }

  const companyId = await resolveCompanyIdForRecipients(toList);
  if (!companyId) {
    return { error: "Aucune entreprise ne correspond à cette adresse de réception." as const };
  }

  const clientId = await resolveClientId(companyId, from);
  const content = emailId ? await fetchReceivedEmailContent(emailId) : {};

  const record = await recordInboundEmail({
    companyId,
    from,
    to: toList[0],
    subject,
    bodyText: content.text,
    bodyHtml: content.html,
    clientId,
    providerId: emailId,
  });

  if ("error" in record && record.error) {
    return { error: record.error };
  }

  const { createNotification } = await import(
    "@/lib/notifications/notification-service"
  );
  await createNotification({
    companyId,
    title: "Nouveau courriel reçu",
    body: subject,
    href: "/inbox",
  });

  return { ok: true as const, email: record, companyId, clientId };
}
