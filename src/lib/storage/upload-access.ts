import { createHmac, timingSafeEqual } from "crypto";
import { authSecret } from "@/lib/auth/demo-session";

const SCOPES = new Set(["marketing", "team-chat", "documents"]);

export function companyIdFromUploadKey(key: string): string | null {
  const [scope, companyId, ...rest] = key.split("/");
  if (!scope || !companyId || rest.length === 0) return null;
  if (!SCOPES.has(scope)) return null;
  if (companyId === "." || companyId === ".." || companyId.includes("\\")) return null;
  return companyId;
}

function signingSecret() {
  const secret = authSecret();
  return secret || null;
}

export function uploadSignatureTtlSec(key: string) {
  return key.startsWith("team-chat/") ? 60 * 60 : 60 * 60 * 24 * 7;
}

export function signUploadKey(key: string, exp: number, secret?: string) {
  const value = secret ?? signingSecret();
  if (!value) {
    throw new Error("BETTER_AUTH_SECRET requis pour signer un upload.");
  }
  return createHmac("sha256", value).update(`${exp}.${key}`).digest("base64url");
}

export function signedUploadQuery(key: string, nowMs = Date.now()) {
  const exp = Math.floor(nowMs / 1000) + uploadSignatureTtlSec(key);
  return `exp=${exp}&sig=${encodeURIComponent(signUploadKey(key, exp))}`;
}

export function verifyUploadSignature(
  key: string,
  expRaw: string | null,
  sig: string | null,
  nowMs = Date.now()
) {
  const secret = signingSecret();
  if (!secret || !expRaw || !sig) return false;
  if (!/^\d+$/.test(expRaw)) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(nowMs / 1000)) return false;
  let expected: string;
  try {
    expected = signUploadKey(key, exp, secret);
  } catch {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Session du même tenant, admin plateforme, ou URL signée (TTL court pour team-chat).
 */
export async function authorizeUploadRead(input: {
  key: string;
  exp: string | null;
  sig: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (verifyUploadSignature(input.key, input.exp, input.sig)) return { ok: true };

  const { enrichSession, getRequestSession } = await import("@/lib/auth/auth-service");
  const session = await getRequestSession();
  if (!session) {
    return { ok: false, status: 401, error: "Connexion requise." };
  }
  const enriched = await enrichSession(session);
  if (!enriched) {
    return { ok: false, status: 401, error: "Session expirée." };
  }
  if (enriched.isPlatformAdmin) return { ok: true };

  const companyId = companyIdFromUploadKey(input.key);
  if (!companyId || companyId !== enriched.companyId) {
    return { ok: false, status: 403, error: "Fichier hors entreprise." };
  }
  return { ok: true };
}
