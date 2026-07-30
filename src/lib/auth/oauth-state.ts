import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { authSecret } from "@/lib/auth/demo-session";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type OAuthStatePayload = {
  next: string;
  nonce: string;
  exp: number;
};

function requireSecret() {
  const secret = authSecret();
  if (!secret) {
    throw new Error(
      "BETTER_AUTH_SECRET manquant — impossible de signer le state OAuth."
    );
  }
  return secret;
}

function b64url(input: string | Buffer) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64");
}

function signBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest();
}

/** Only same-origin relative paths — blocks //evil.com open redirects. */
export function sanitizeOAuthNext(next: string | null | undefined): string {
  const value = (next || "/dashboard").trim() || "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  if (value.includes("\\") || value.includes("\0")) return "/dashboard";
  // Reject scheme-relative or absolute URLs smuggled after /
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return "/dashboard";
  return value;
}

export function createSignedOAuthState(next?: string | null): string {
  const secret = requireSecret();
  const payload: OAuthStatePayload = {
    next: sanitizeOAuthNext(next),
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(signBody(body, secret));
  return `${body}.${sig}`;
}

export function verifySignedOAuthState(
  state: string | null | undefined
): { ok: true; payload: OAuthStatePayload } | { ok: false; error: string } {
  if (!state?.trim()) {
    return { ok: false, error: "State OAuth manquant." };
  }

  const secret = authSecret();
  if (!secret) {
    return { ok: false, error: "Secret de signature indisponible." };
  }

  const parts = state.trim().split(".");
  if (parts.length !== 2) {
    return { ok: false, error: "State OAuth mal formé." };
  }
  const [body, sig] = parts as [string, string];
  if (!body || !sig) {
    return { ok: false, error: "State OAuth mal formé." };
  }

  let expected: Buffer;
  let provided: Buffer;
  try {
    expected = signBody(body, secret);
    provided = fromB64url(sig);
  } catch {
    return { ok: false, error: "State OAuth invalide." };
  }

  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return { ok: false, error: "State OAuth falsifié." };
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8")) as OAuthStatePayload;
  } catch {
    return { ok: false, error: "State OAuth illisible." };
  }

  if (
    typeof payload.exp !== "number" ||
    typeof payload.nonce !== "string" ||
    typeof payload.next !== "string"
  ) {
    return { ok: false, error: "State OAuth incomplet." };
  }

  if (payload.exp < Date.now()) {
    return { ok: false, error: "State OAuth expiré." };
  }

  payload.next = sanitizeOAuthNext(payload.next);
  return { ok: true, payload };
}
