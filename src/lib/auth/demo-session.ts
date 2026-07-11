import { cookies } from "next/headers";
import type { Role } from "@/types";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";

const COOKIE = "klirline_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type DemoSession = {
  email: string;
  companyId: string;
  role: Role;
  exp: number;
};

function secret() {
  return process.env.BETTER_AUTH_SECRET?.trim() || "klirbuild-demo-secret";
}

function sign(payload: DemoSession): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = Buffer.from(
    [...data + secret()].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString()
  ).toString("base64url");
  return `${data}.${sig}`;
}

function verify(token: string): DemoSession | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = sign(JSON.parse(Buffer.from(data, "base64url").toString()) as DemoSession);
  if (expected !== token) return null;
  const session = JSON.parse(Buffer.from(data, "base64url").toString()) as DemoSession;
  if (session.exp < Date.now()) return null;
  if (!session.companyId) {
    session.companyId = DEMO_COMPANY_ID;
  }
  return session;
}

export function createDemoSession(
  email: string,
  role: Role = "COMPANY_ADMIN",
  companyId: string = DEMO_COMPANY_ID
) {
  const payload: DemoSession = {
    email,
    companyId,
    role,
    exp: Date.now() + MAX_AGE * 1000,
  };
  return { token: sign(payload), session: payload, maxAge: MAX_AGE };
}

export async function getServerSession(): Promise<DemoSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  return verify(raw);
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function parseSessionCookie(token: string): DemoSession | null {
  return verify(token);
}

export { COOKIE };
