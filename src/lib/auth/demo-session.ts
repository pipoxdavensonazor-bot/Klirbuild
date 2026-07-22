/**
 * Session cookies signed with HMAC-SHA256 (Web Crypto — Edge + Node).
 */

import type { Role } from "@/types";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";

const COOKIE = "klirline_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const PENDING_2FA_COOKIE = "klirline_2fa_pending";
const PENDING_2FA_MAX_AGE = 60 * 10; // 10 minutes

export type DemoSession = {
  email: string;
  companyId: string;
  role: Role;
  exp: number;
  /** Admin Klirline — accès multi-entreprises */
  isPlatformAdmin?: boolean;
  /** Entreprise d'origine quand on « entre » dans un tenant */
  homeCompanyId?: string;
};

export type Pending2fa = {
  email: string;
  companyId: string;
  role: Role;
  exp: number;
  isPlatformAdmin?: boolean;
};

function fallbackDevSecret() {
  return "klirbuild-dev-only-secret-change-me!!";
}

/** Secret used for signing. Empty string in prod if misconfigured (verify fails). */
export function authSecret() {
  const s = process.env.BETTER_AUTH_SECRET?.trim();
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") return "";
  return fallbackDevSecret();
}

export function isAuthSecretHardened() {
  const s = process.env.BETTER_AUTH_SECRET?.trim() || "";
  return s.length >= 32 && s !== "klirbuild-demo-secret";
}

function requireSignSecret() {
  const s = authSecret();
  if (!s) {
    throw new Error(
      "BETTER_AUTH_SECRET manquant ou trop court (32+ caractères requis en production)."
    );
  }
  return s;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(u8).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  if (typeof atob === "function") {
    const bin = atob(b64 + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64 + pad, "base64"));
}

function encodePayload(payload: object) {
  const json = JSON.stringify(payload);
  if (typeof btoa === "function") {
    return toBase64Url(new TextEncoder().encode(json));
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

function decodePayload(data: string) {
  if (typeof atob === "function") {
    return new TextDecoder().decode(fromBase64Url(data));
  }
  return Buffer.from(data, "base64url").toString("utf8");
}

async function hmacSign(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return toBase64Url(sig);
}

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function signPayload(payload: object) {
  const data = encodePayload(payload);
  const sig = await hmacSign(data, requireSignSecret());
  return `${data}.${sig}`;
}

async function verifyPayload<T extends { exp: number }>(
  token: string
): Promise<T | null> {
  const secret = authSecret();
  if (!secret) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = await hmacSign(data, secret);
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const payload = JSON.parse(decodePayload(data)) as T;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createDemoSession(
  email: string,
  role: DemoSession["role"] = "COMPANY_ADMIN",
  companyId: string,
  extras?: {
    isPlatformAdmin?: boolean;
    homeCompanyId?: string;
  }
) {
  const payload: DemoSession = {
    email,
    companyId: companyId || DEMO_COMPANY_ID,
    role,
    exp: Date.now() + MAX_AGE * 1000,
    ...(extras?.isPlatformAdmin ? { isPlatformAdmin: true } : {}),
    ...(extras?.homeCompanyId ? { homeCompanyId: extras.homeCompanyId } : {}),
  };
  return { token: await signPayload(payload), session: payload, maxAge: MAX_AGE };
}

export async function getServerSession(): Promise<DemoSession | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const session = await verifyPayload<DemoSession>(raw);
  if (!session) return null;
  if (!session.companyId) session.companyId = DEMO_COMPANY_ID;
  return session;
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

export async function parseSessionCookie(
  token: string
): Promise<DemoSession | null> {
  const session = await verifyPayload<DemoSession>(token);
  if (!session) return null;
  if (!session.companyId) session.companyId = DEMO_COMPANY_ID;
  return session;
}

export async function createPending2faToken(profile: {
  email: string;
  companyId: string;
  role: Role;
  isPlatformAdmin?: boolean;
}) {
  const payload: Pending2fa = {
    email: profile.email,
    companyId: profile.companyId,
    role: profile.role,
    ...(profile.isPlatformAdmin ? { isPlatformAdmin: true } : {}),
    exp: Date.now() + PENDING_2FA_MAX_AGE * 1000,
  };
  return {
    token: await signPayload(payload),
    maxAge: PENDING_2FA_MAX_AGE,
    payload,
  };
}

export async function verifyPending2faToken(
  token: string
): Promise<Pending2fa | null> {
  return verifyPayload<Pending2fa>(token);
}

export { COOKIE, PENDING_2FA_COOKIE, MAX_AGE, PENDING_2FA_MAX_AGE };
