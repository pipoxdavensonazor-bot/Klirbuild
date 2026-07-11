import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE,
  createDemoSession,
  parseSessionCookie,
  sessionCookieOptions,
  type DemoSession,
} from "@/lib/auth/demo-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { prisma } from "@/lib/db";

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function authenticateUser(email: string, password: string) {
  if (!hasDatabase()) {
    const demoOk =
      (email === "alex@klirline.demo" && password === "password") ||
      email.endsWith("@klirline.demo");
    if (!demoOk) return null;
    return {
      email,
      companyId: DEMO_COMPANY_ID,
      role: "COMPANY_ADMIN" as const,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return {
    email: user.email,
    companyId: user.companyId,
    role: user.role,
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
  const company = await prisma.company.create({
    data: {
      name: input.companyName,
      email: input.email,
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

export function sessionResponse(
  profile: { email: string; companyId: string; role: DemoSession["role"] },
  maxAge?: number
) {
  const { token, session, maxAge: age } = createDemoSession(
    profile.email,
    profile.role,
    profile.companyId
  );
  const res = NextResponse.json({
    ok: true,
    email: session.email,
    role: session.role,
    companyId: session.companyId,
  });
  res.cookies.set(COOKIE, token, sessionCookieOptions(maxAge ?? age));
  return res;
}

export async function requireSession(): Promise<DemoSession | NextResponse> {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  return session;
}
