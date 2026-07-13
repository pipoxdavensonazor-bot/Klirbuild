import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";

export type CompanyEmailContext = {
  companyId: string;
  companyName: string;
  senderName: string;
  /** Adresse affichée dans la boîte courriel et les journaux */
  logicalFrom: string;
  /** Adresse Resend vérifiée (domaine plateforme) */
  platformFrom: string;
  /** En-tête From complet pour Resend */
  displayFrom: string;
  replyTo: string;
  inboxEmail: string;
};

export function inboundEmailDomain() {
  return (
    process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() || "inbox.klirline.ca"
  );
}

function platformFromAddress() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.COMPANY_INBOX_EMAIL?.trim() ||
    "billing@klirline.ca"
  );
}

function sanitizeDisplayName(name: string) {
  return name.replace(/["<>]/g, "'").trim() || "Votre entreprise";
}

export function buildDisplayFrom(senderName: string, fromEmail: string) {
  return `${sanitizeDisplayName(senderName)} <${fromEmail}>`;
}

/** Slug ASCII pour local-part (ex. « Kréyol Inc. » → « kreyol-inc »). */
export function slugifyCompanyName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "entreprise";
}

export function isPlatformInboxEmail(email: string | null | undefined) {
  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  const domain = inboundEmailDomain();
  return normalized.endsWith(`@${domain}`);
}

/** Attribue une adresse unique sur le domaine de réception plateforme. */
export async function allocateCompanyInboxEmail(companyName: string) {
  const domain = inboundEmailDomain();
  const base = slugifyCompanyName(companyName);
  const candidates = [base, ...Array.from({ length: 50 }, (_, i) => `${base}-${i + 2}`)];

  for (const local of candidates) {
    const inboxEmail = `${local}@${domain}`;
    if (!hasDatabase()) return inboxEmail;

    const taken = await prisma.company.findFirst({
      where: { inboxEmail: { equals: inboxEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (!taken) return inboxEmail;
  }

  return `${base}-${Date.now().toString(36)}@${domain}`;
}

/**
 * Garantit une adresse dédiée plateforme. Ne remplace pas une adresse déjà
 * sur le domaine inbound.
 */
export async function ensureCompanyInboxEmail(companyId: string) {
  if (!hasDatabase()) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, inboxEmail: true },
  });
  if (!company) return null;

  if (isPlatformInboxEmail(company.inboxEmail)) {
    return company.inboxEmail!.trim().toLowerCase();
  }

  const inboxEmail = await allocateCompanyInboxEmail(company.name);
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { inboxEmail },
    select: { inboxEmail: true },
  });
  return updated.inboxEmail;
}

/** Dérive les champs courriel à la création (inboxEmail à allouer via allocate). */
export function deriveCompanyEmailFields(input: {
  companyName: string;
  adminEmail: string;
  inboxEmail: string;
}) {
  const email = input.adminEmail.trim().toLowerCase();
  return {
    email,
    emailFrom: email,
    inboxEmail: input.inboxEmail.trim().toLowerCase(),
    emailSenderName: input.companyName.trim(),
  };
}

async function loadCompanyRecord(companyId: string) {
  if (hasDatabase()) {
    const row = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        emailFrom: true,
        inboxEmail: true,
        emailSenderName: true,
      },
    });
    if (row) return row;
  }

  return {
    id: companyId,
    name: "Votre entreprise",
    email: null as string | null,
    emailFrom: null as string | null,
    inboxEmail: null as string | null,
    emailSenderName: null as string | null,
  };
}

export async function getCompanyEmailContext(
  companyId: string
): Promise<CompanyEmailContext> {
  const company = await loadCompanyRecord(companyId);
  const platformFrom = platformFromAddress();
  const senderName = company.emailSenderName?.trim() || company.name;
  const logicalFrom =
    company.emailFrom?.trim() ||
    company.email?.trim() ||
    company.inboxEmail?.trim() ||
    platformFrom;
  const replyTo =
    company.inboxEmail?.trim() ||
    company.emailFrom?.trim() ||
    company.email?.trim() ||
    logicalFrom;
  const inboxEmail = company.inboxEmail?.trim() || company.email?.trim() || replyTo;

  return {
    companyId,
    companyName: company.name,
    senderName,
    logicalFrom,
    platformFrom,
    displayFrom: buildDisplayFrom(senderName, platformFrom),
    replyTo,
    inboxEmail,
  };
}
