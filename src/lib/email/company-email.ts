import { hasDatabase } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { prisma } from "@/lib/db";
import { demoCompany } from "@/lib/mock-data";

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

/** Dérive les champs courriel à la création d'une entreprise. */
export function deriveCompanyEmailFields(input: {
  companyName: string;
  adminEmail: string;
}) {
  const email = input.adminEmail.trim().toLowerCase();
  return {
    email,
    emailFrom: email,
    inboxEmail: email,
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

  if (companyId === DEMO_COMPANY_ID || companyId === demoCompany.id) {
    return {
      id: demoCompany.id,
      name: demoCompany.name,
      email: demoCompany.email,
      emailFrom: demoCompany.email,
      inboxEmail: demoCompany.email,
      emailSenderName: demoCompany.name,
    };
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
