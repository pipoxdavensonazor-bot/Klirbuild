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
  },
  maxAge?: number
) {
  const { token, session, maxAge: age } = await createDemoSession(
    profile.email,
    profile.role,
    profile.companyId,
    {
      isPlatformAdmin: profile.isPlatformAdmin,
      homeCompanyId: profile.homeCompanyId,
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

/** Sessions anciennes peuvent manquer companyId / isPlatformAdmin — résout depuis la DB. */
export async function enrichSession(session: DemoSession): Promise<DemoSession> {
  let next = { ...session };

  if (!next.companyId?.trim() || next.isPlatformAdmin === undefined) {
    if (hasDatabase()) {
      const user = await prisma.user.findUnique({
        where: { email: session.email },
        select: { companyId: true, isPlatformAdmin: true, role: true },
      });
      if (user) {
        if (!next.companyId?.trim()) next.companyId = user.companyId;
        if (next.isPlatformAdmin === undefined) {
          next.isPlatformAdmin =
            Boolean(user.isPlatformAdmin) || user.role === "SUPER_ADMIN";
        }
      }
    }
  }

  if (!next.companyId?.trim()) next.companyId = DEMO_COMPANY_ID;
  return next;
}

export async function requireSession(): Promise<DemoSession | NextResponse> {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  return enrichSession(session);
}
