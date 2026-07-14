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
    /** Adresse d’origine si le message a été transféré (ex. Cloudflare → Resend). */
    received_for?: string[];
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resend webhook arrives before body is always ready — retry briefly. */
export async function fetchReceivedEmailContent(emailId: string): Promise<{
  text?: string;
  html?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return {};

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(
        `https://api.resend.com/emails/receiving/${emailId}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          text?: string | null;
          html?: string | null;
        };
        const text = data.text?.trim() || undefined;
        const html = data.html?.trim() || undefined;
        if (text || html) return { text, html };
      } else if (res.status === 404 || res.status === 409 || res.status >= 500) {
        /* content may not be ready yet — retry */
      } else {
        console.warn(
          `[inbound] Resend receiving ${emailId} HTTP ${res.status}`
        );
        return {};
      }
    } catch (error) {
      console.warn(`[inbound] Resend receiving ${emailId} failed`, error);
    }
    if (attempt < maxAttempts) await sleep(250 * attempt);
  }
  return {};
}

/** Backfill body for inbound rows saved before content was available. */
export async function hydrateInboundEmailBodies(
  emails: Array<{
    id: string;
    direction: string;
    providerId?: string | null;
    bodyText?: string | null;
    bodyHtml?: string | null;
  }>
) {
  const needs = emails.filter(
    (e) =>
      e.direction === "inbound" &&
      e.providerId &&
      !e.bodyText?.trim() &&
      !e.bodyHtml?.trim()
  );
  if (!needs.length) return emails;

  await Promise.all(
    needs.slice(0, 10).map(async (e) => {
      const content = await fetchReceivedEmailContent(e.providerId!);
      if (!content.text && !content.html) return;
      await prisma.emailMessage.update({
        where: { id: e.id },
        data: {
          bodyText: content.text ?? null,
          bodyHtml: content.html ?? null,
        },
      });
      e.bodyText = content.text ?? e.bodyText;
      e.bodyHtml = content.html ?? e.bodyHtml;
    })
  );

  return emails;
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
  const receivedFor = event.data.received_for ?? [];
  const subject = event.data.subject?.trim() || "(sans objet)";

  // Prefer original recipient (forwarded) then envelope To — enables free
  // branding: *@inbox.klirline.ca → Cloudflare → *@estabronae.resend.app
  const routeCandidates = [...receivedFor, ...toList];
  if (!routeCandidates.length) {
    return { error: "Destinataire manquant dans l'événement Resend." as const };
  }

  const companyId = await resolveCompanyIdForRecipients(routeCandidates);
  if (!companyId) {
    return { error: "Aucune entreprise ne correspond à cette adresse de réception." as const };
  }

  const clientId = await resolveClientId(companyId, from);
  const content = emailId ? await fetchReceivedEmailContent(emailId) : {};
  const displayTo =
    receivedFor.map(normalizeAddress).find(Boolean) ||
    toList.map(normalizeAddress).find(Boolean) ||
    routeCandidates[0];

  const record = await recordInboundEmail({
    companyId,
    from,
    to: displayTo,
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
