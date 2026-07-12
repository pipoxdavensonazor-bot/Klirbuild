import { prisma } from "@/lib/db";
import { hasDatabase } from "@/lib/auth/auth-service";
import { deriveCompanyEmailFields } from "@/lib/email/company-email";
import { hashPassword } from "@/lib/auth/password";

export function isGoogleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function googleAuthUrl(state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const redirectUri = `${appBaseUrl()}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const redirectUri = `${appBaseUrl()}/api/auth/google/callback`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error("Échange token Google échoué.");
  }
  return res.json() as Promise<{ access_token: string }>;
}

export async function fetchGoogleProfile(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Profil Google introuvable.");
  return res.json() as Promise<{
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }>;
}

export async function loginOrRegisterGoogleUser(profile: {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis pour Google OAuth en production." as const };
  }

  const email = profile.email.trim().toLowerCase();
  if (!email) return { error: "Email Google manquant." as const };

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const linked = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: profile.id,
        },
      },
      include: { user: true },
    });
    user = linked?.user ?? null;
  }

  if (!user) {
    const emailFields = deriveCompanyEmailFields({
      companyName: profile.name ?? email.split("@")[0],
      adminEmail: email,
    });
    const company = await prisma.company.create({
      data: {
        name: profile.name ?? "Mon entreprise",
        ...emailFields,
        plan: "starter",
        subscriptionStatus: "trialing",
        enabledModules: ["construction-os", "crm"],
      },
    });
    const passwordHash = await hashPassword(
      `google-oauth-${profile.id}-${Math.random().toString(36).slice(2)}`
    );
    user = await prisma.user.create({
      data: {
        name: profile.name ?? email,
        email,
        passwordHash,
        role: "COMPANY_ADMIN",
        companyId: company.id,
        image: profile.picture,
        emailVerified: new Date(),
      },
    });
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: profile.id,
      },
    },
    create: {
      userId: user.id,
      provider: "google",
      providerAccountId: profile.id,
    },
    update: { userId: user.id },
  });

  if (profile.picture && !user.image) {
    await prisma.user.update({
      where: { id: user.id },
      data: { image: profile.picture, emailVerified: new Date() },
    });
  }

  return {
    user: {
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    },
  };
}
