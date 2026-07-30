import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE,
  createDemoSession,
  parseSessionCookie,
  sessionCookieOptions,
  type DemoSession,
} from "@/lib/auth/demo-session";
import { hasDatabaseUrl } from "@/lib/api/database-guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { prisma } from "@/lib/db";
import {
  allocateCompanyInboxEmail,
  deriveCompanyEmailFields,
} from "@/lib/email/company-email";

export function hasDatabase() {
  return hasDatabaseUrl();
}

export async function authenticateUser(email: string, password: string) {
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") return null;
    const devOk =
      (email === "alex@klirline.demo" && password === "password") ||
      email.endsWith("@klirline.demo");
    if (!devOk) return null;
    return {
      email,
      companyId: DEMO_COMPANY_ID,
      role: "COMPANY_ADMIN" as const,
      totpEnabled: false,
      isPlatformAdmin: false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: { select: { suspended: true } } },
  });
  if (!user?.passwordHash) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const isPlatformAdmin =
    Boolean(user.isPlatformAdmin) || user.role === "SUPER_ADMIN";
  if (user.company?.suspended && !isPlatformAdmin) {
    return null;
  }
  return {
    email: user.email,
    companyId: user.companyId,
    role: user.role,
    totpEnabled: Boolean(user.totpEnabled),
    isPlatformAdmin,
    sessionVersion: user.sessionVersion ?? 0,
  };
}

export async function registerCompany(input: {
  name: string;
  email: string;
  companyName: string;
  password: string;
}) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis pour créer un compte en production." };
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return { error: "Un compte existe déjà avec cet email." };

  const passwordHash = await hashPassword(input.password);
  const inboxEmail = await allocateCompanyInboxEmail(input.companyName);
  const emailFields = deriveCompanyEmailFields({
    companyName: input.companyName,
    adminEmail: input.email,
    inboxEmail,
  });
  const company = await prisma.company.create({
    data: {
      name: input.companyName,
      ...emailFields,
      plan: "starter",
      subscriptionStatus: "trialing",
      enabledModules: ["construction-os", "crm"],
    },
  });

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "COMPANY_ADMIN",
      companyId: company.id,
    },
  });

  return {
    user: {
      email: user.email,
      companyId: company.id,
      role: user.role,
    },
  };
}

export async function getRequestSession(): Promise<DemoSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return parseSessionCookie(raw);
}

export async function sessionResponse(
  profile: {
    email: string;
    companyId: string;
    role: DemoSession["role"];
    isPlatformAdmin?: boolean;
    homeCompanyId?: string;
    sessionVersion?: number;
  },
  maxAge?: number
) {
  let sessionVersion = profile.sessionVersion;
  let isPlatformAdmin = profile.isPlatformAdmin;
  if (hasDatabase() && (sessionVersion === undefined || isPlatformAdmin === undefined)) {
    const user = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { sessionVersion: true, isPlatformAdmin: true, role: true },
    });
    if (user) {
      sessionVersion = user.sessionVersion ?? 0;
      isPlatformAdmin =
        Boolean(user.isPlatformAdmin) || user.role === "SUPER_ADMIN";
    }
  }

  const { token, session, maxAge: age } = await createDemoSession(
    profile.email,
    profile.role,
    profile.companyId,
    {
      isPlatformAdmin,
      homeCompanyId: profile.homeCompanyId,
      sessionVersion: sessionVersion ?? 0,
    }
  );
  const res = NextResponse.json({
    ok: true,
    email: session.email,
    role: session.role,
    companyId: session.companyId,
    isPlatformAdmin: Boolean(session.isPlatformAdmin),
  });
  res.cookies.set(COOKIE, token, sessionCookieOptions(maxAge ?? age));
  return res;
}

/**
 * Revalidate privilege claims against the DB on every request.
 * Rejects cookies whose sessionVersion no longer matches (password reset/change).
 */
export async function enrichSession(
  session: DemoSession
): Promise<DemoSession | null> {
  let next = { ...session };

  if (hasDatabase()) {
    const user = await prisma.user.findUnique({
      where: { email: session.email },
      select: {
        companyId: true,
        isPlatformAdmin: true,
        role: true,
        sessionVersion: true,
        company: { select: { suspended: true } },
      },
    });
    if (!user) return null;

    const dbVersion = user.sessionVersion ?? 0;
    if ((session.sessionVersion ?? 0) !== dbVersion) return null;

    next.companyId = user.companyId;
    next.role = user.role as DemoSession["role"];
    next.isPlatformAdmin =
      Boolean(user.isPlatformAdmin) || user.role === "SUPER_ADMIN";
    next.sessionVersion = dbVersion;

    if (user.company?.suspended && !next.isPlatformAdmin) return null;
  }

  if (!next.companyId?.trim()) next.companyId = DEMO_COMPANY_ID;
  return next;
}

export async function bumpSessionVersion(userId: string) {
  if (!hasDatabase()) return;
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}

export async function requireSession(): Promise<DemoSession | NextResponse> {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  const enriched = await enrichSession(session);
  if (!enriched) {
    return NextResponse.json(
      { error: "Session expirée — reconnectez-vous." },
      { status: 401 }
    );
  }
  return enriched;
}
