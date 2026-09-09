/**
 * Admin password + session token helpers (Edge / Node / Workers safe).
 * Production: ADMIN_PASSWORD + ADMIN_SECRET required (no hardcoded fallback).
 * Development: local defaults allowed for convenience.
 */

const DEV_PASSWORD = "LeonneAdmin2026";
const DEV_SECRET = "dev-only-session-secret";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getAdminSecretsError(): string | null {
  if (!isProduction()) return null;
  const password = process.env.ADMIN_PASSWORD?.trim();
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!password) {
    return "ADMIN_PASSWORD manquant en production. Définissez-le via wrangler secret put.";
  }
  if (!secret || secret.length < 16) {
    return "ADMIN_SECRET manquant ou trop court (min. 16 caractères) en production.";
  }
  return null;
}

export function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (password) return password;
  if (isProduction()) {
    throw new Error(getAdminSecretsError() || "ADMIN_PASSWORD requis");
  }
  return DEV_PASSWORD;
}

export function getAdminSecret(): string {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (secret && secret.length >= 16) return secret;
  if (isProduction()) {
    throw new Error(getAdminSecretsError() || "ADMIN_SECRET requis");
  }
  return secret && secret.length > 0 ? secret : DEV_SECRET;
}

export function verifyAdminPassword(password: string): boolean {
  try {
    return password === getAdminPassword();
  } catch {
    return false;
  }
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 session token (async, Web Crypto). */
export async function createSessionToken(): Promise<string> {
  const password = getAdminPassword();
  const secret = getAdminSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`leonne-admin-session:v1:${password}`)
  );
  return `adm_${toHex(sig)}`;
}

export async function sessionTokenMatches(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const expected = await createSessionToken();
    if (token.length !== expected.length) return false;
    // Constant-time-ish compare
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
