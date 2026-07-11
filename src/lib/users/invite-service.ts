import { randomBytes } from "crypto";
import type { Role } from "@/types";
import { hasDatabase } from "@/lib/auth/auth-service";
import { getBillingState } from "@/lib/billing/subscription-service";
import { getPlan } from "@/lib/billing/plans";
import { prisma } from "@/lib/db";
import { getCompanyEmailContext } from "@/lib/email/company-email";
import {
  logEmail,
  sendEmail,
} from "@/lib/email/email-service";
import { inviteEmailHtml, inviteEmailText } from "@/lib/email/templates";

const INVITE_TTL_DAYS = 7;

function appUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3000";
  return base.startsWith("http") ? base : `https://${base}`;
}

export function inviteRequiresDatabase() {
  return !hasDatabase();
}

export async function countCompanySeats(companyId: string) {
  const [users, invites] = await Promise.all([
    prisma.user.count({ where: { companyId } }),
    prisma.invitation.count({
      where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);
  return users + invites;
}

export async function listCompanyUsers(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
}

export async function listPendingInvitations(companyId: string) {
  return prisma.invitation.findMany({
    where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });
}

export async function createInvitation(input: {
  companyId: string;
  email: string;
  role?: Role;
  invitedByEmail: string;
}) {
  if (inviteRequiresDatabase()) {
    return { error: "DATABASE_URL requis pour inviter des utilisateurs." as const };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Courriel invalide." as const };
  }

  const role = input.role ?? "EMPLOYEE";
  if (role === "SUPER_ADMIN") {
    return { error: "Rôle non autorisé pour une invitation." as const };
  }

  const billing = await getBillingState(input.companyId);
  const plan = getPlan(billing.plan);
  const seats = await countCompanySeats(input.companyId);
  if (plan.maxUsers < 9999 && seats >= plan.maxUsers) {
    return {
      error: `Limite du plan ${plan.name} atteinte (${plan.maxUsers} utilisateurs). Passez à un plan supérieur.`,
    } as const;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Un compte existe déjà avec ce courriel." as const };
  }

  const pending = await prisma.invitation.findFirst({
    where: { companyId: input.companyId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pending) {
    return { error: "Une invitation est déjà en attente pour ce courriel." as const };
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      companyId: input.companyId,
      email,
      role,
      token,
      expiresAt,
    },
  });

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { name: true },
  });
  const companyName = company?.name ?? "Votre entreprise";

  await prisma.auditLog.create({
    data: {
      companyId: input.companyId,
      action: "user.invited",
      meta: { email, role, invitedBy: input.invitedByEmail },
    },
  });

  const origin = appUrl();
  const inviteUrl = `${origin}/register?invite=${token}`;

  const html = inviteEmailHtml({
    companyName,
    inviteUrl,
    role,
    invitedByEmail: input.invitedByEmail,
    expiresAt: invitation.expiresAt.toISOString(),
    appUrl: origin,
  });
  const text = inviteEmailText({
    companyName,
    inviteUrl,
    role,
    invitedByEmail: input.invitedByEmail,
    expiresAt: invitation.expiresAt.toISOString(),
  });

  const sent = await sendEmail({
    companyId: input.companyId,
    to: email,
    subject: `Invitation — ${companyName}`,
    html,
    text,
  });

  if ("error" in sent && sent.error) {
    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
      inviteUrl,
      email: { delivered: false, error: sent.error },
    };
  }

  const emailCtx = await getCompanyEmailContext(input.companyId);
  await logEmail({
    companyId: input.companyId,
    direction: "outbound",
    fromEmail: emailCtx.logicalFrom,
    toEmail: email,
    subject: `Invitation — ${companyName}`,
    bodyText: text,
    bodyHtml: html,
    providerId: "providerId" in sent ? sent.providerId : undefined,
  });

  return {
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    },
    inviteUrl,
    email: {
      delivered: "delivered" in sent ? sent.delivered : false,
      simulated: "simulated" in sent ? sent.simulated : false,
      mailto: "mailto" in sent ? sent.mailto : undefined,
    },
  };
}

export async function getInvitationByToken(token: string) {
  if (!token) return null;
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { company: { select: { name: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return null;
  }
  return invitation;
}

export async function acceptInvitation(input: {
  token: string;
  name: string;
  password: string;
}) {
  if (inviteRequiresDatabase()) {
    return { error: "DATABASE_URL requis." as const };
  }

  const invitation = await getInvitationByToken(input.token);
  if (!invitation) {
    return { error: "Invitation invalide ou expirée." as const };
  }

  const name = input.name.trim();
  if (!name) return { error: "Nom requis." as const };
  if (input.password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." as const };
  }

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existing) return { error: "Un compte existe déjà avec ce courriel." as const };

  const { hashPassword } = await import("@/lib/auth/password");
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        companyId: invitation.companyId,
      },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    return created;
  });

  return {
    user: {
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    },
  };
}
