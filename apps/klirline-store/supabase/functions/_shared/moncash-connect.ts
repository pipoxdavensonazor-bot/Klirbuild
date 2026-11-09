/**
 * MonCash Connect (moncashconnect.com) — décision pure, aucun secret, aucun appel.
 *
 * Contrat suivi : https://moncashconnect.com/en/docs (référence API, 2026-11-09)
 * - POST /v1/pay-create, Bearer sk_proj_… ou sk_test_proj_…
 * - GET /v1/pay-status?referenceId= avec le même Bearer
 * - Webhook HMAC-SHA256 : X-MCC-Signature (corps brut) et X-MCC-Signature-V2
 *   (timestamp + "." + corps brut), horodatage ≤ 5 min
 * - amount entier HTG, 1 à 100 000 dans le tableau « Create a payment »
 * - paid seulement si status === "completed" et amount / reference concordent
 *
 * Le guide sandbox https://moncashconnect.com/docs/sandbox contredit la référence
 * sur le plafond (1 000 000), le paramètre pay-status (?reference= sans auth),
 * l'événement payment.cancelled et le champ livemode. Ces variantes ne sont
 * pas implémentées.
 */

export const CONNECT_API_BASE = "https://api.moncashconnect.com/v1";
export const CONNECT_AMOUNT_MIN_HTG = 1;
export const CONNECT_AMOUNT_MAX_HTG = 100_000;
export const CONNECT_RETURN_ORIGIN = "https://klirline.com";
export const CONNECT_WEBHOOK_PATH = "/functions/v1/moncash-payment/webhook";
export const CONNECT_TIMESTAMP_WINDOW_SECONDS = 300;

const REFERENCE_ID = /^[A-Za-z0-9_-]{1,100}$/;
const PRINTABLE_ASCII = /^[\x20-\x7E]{1,200}$/;

export function connectAmountHtg(
  total: unknown,
):
  | { ok: true; amount: number }
  | { ok: false; reason: "invalid" | "not_integer" | "above_documented_max" } {
  const n = typeof total === "number"
    ? total
    : typeof total === "string" && total.trim() !== ""
    ? Number(total)
    : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "invalid" };
  const amount = Math.round(n);
  if (Math.abs(n - amount) > 0.001) return { ok: false, reason: "not_integer" };
  if (!Number.isSafeInteger(amount) || amount < CONNECT_AMOUNT_MIN_HTG) {
    return { ok: false, reason: "invalid" };
  }
  if (amount > CONNECT_AMOUNT_MAX_HTG) {
    return { ok: false, reason: "above_documented_max" };
  }
  return { ok: true, amount };
}

export function connectReferenceId(orderId: string): string | null {
  return REFERENCE_ID.test(orderId) ? orderId : null;
}

export function connectIdempotencyKey(referenceId: string): string | null {
  return PRINTABLE_ASCII.test(referenceId) ? referenceId : null;
}

export function connectReturnUrl(orderId: string, origin = CONNECT_RETURN_ORIGIN): string | null {
  if (!connectReferenceId(orderId)) return null;
  const url = new URL(origin);
  if (url.protocol !== "https:") return null;
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("checkout", "moncash_return");
  url.searchParams.set("order_id", orderId);
  return url.toString();
}

export function connectWebhookUrl(supabaseUrl?: string | null): string {
  const base = (supabaseUrl && supabaseUrl.trim()
    ? supabaseUrl.trim()
    : "https://whybbqeeqpkbkatnkjjc.supabase.co"
  ).replace(/\/$/, "");
  return `${base}${CONNECT_WEBHOOK_PATH}`;
}

/** Hosts explicitly shown in the API reference and the sandbox simulator. */
export function connectPaymentUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (host === "pay.moncashconnect.com") return url.toString();
  if (host === "moncashconnect.com" && url.pathname.startsWith("/sim")) {
    return url.toString();
  }
  return null;
}

export type ConnectStatusDecision = "settle" | "failed" | "not_paid" | "mismatch";

/**
 * Money moves only when pay-status (or a signed webhook already checked
 * against pay-status) says completed, for this reference, at this integer amount.
 */
export function decideConnectStatus(input: {
  reference: unknown;
  status: unknown;
  amount: unknown;
  expectedReference: string;
  expectedAmount: number;
}): ConnectStatusDecision {
  if (input.reference !== input.expectedReference) return "mismatch";
  if (typeof input.amount !== "number" || !Number.isInteger(input.amount)) return "mismatch";
  if (input.amount !== input.expectedAmount) return "mismatch";
  if (input.status === "completed") return "settle";
  if (input.status === "failed") return "failed";
  return "not_paid";
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function signaturesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type WebhookCheck =
  | { ok: true }
  | { ok: false; reason: "signature" | "timestamp" | "secret" };

/**
 * API reference: V2 is HMAC(secret, `${timestamp}.${rawBody}`) and is preferred.
 * V1 is HMAC(secret, rawBody). A present V2 header must match; V1 alone is
 * accepted only when V2 is absent. Timestamp older than 5 minutes is rejected.
 */
export async function verifyConnectWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  signatureV2: string | null;
  timestamp: string | null;
  secret: string;
  nowSeconds: number;
}): Promise<WebhookCheck> {
  if (!input.secret) return { ok: false, reason: "secret" };
  const timestamp = input.timestamp?.trim() ?? "";
  if (!/^[0-9]{10}$/.test(timestamp)) return { ok: false, reason: "timestamp" };
  const stampSeconds = Number(timestamp);
  if (!Number.isFinite(stampSeconds)) return { ok: false, reason: "timestamp" };
  if (Math.abs(input.nowSeconds - stampSeconds) > CONNECT_TIMESTAMP_WINDOW_SECONDS) {
    return { ok: false, reason: "timestamp" };
  }

  const v2 = input.signatureV2?.trim() ?? "";
  if (v2) {
    const expected = `sha256=${await hmacSha256Hex(input.secret, `${timestamp}.${input.rawBody}`)}`;
    return signaturesEqual(v2, expected) ? { ok: true } : { ok: false, reason: "signature" };
  }

  const v1 = input.signature?.trim() ?? "";
  if (!v1) return { ok: false, reason: "signature" };
  const expected = `sha256=${await hmacSha256Hex(input.secret, input.rawBody)}`;
  return signaturesEqual(v1, expected) ? { ok: true } : { ok: false, reason: "signature" };
}

export type ConnectWebhookEvent = {
  event: string;
  reference: string;
  amount: number;
  status: string;
};

export function parseConnectWebhookEvent(rawBody: string): ConnectWebhookEvent | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.event !== "string" || !record.event) return null;
  if (typeof record.reference !== "string" || !connectReferenceId(record.reference)) return null;
  if (typeof record.amount !== "number" || !Number.isInteger(record.amount)) return null;
  if (typeof record.status !== "string" || !record.status) return null;
  return {
    event: record.event,
    reference: record.reference,
    amount: record.amount,
    status: record.status,
  };
}

export function redactConnectSecrets(text: string): string {
  return text
    .replace(/sk_(?:test_)?proj_[A-Za-z0-9]+/g, "sk_proj_[redacted]")
    .replace(/whsec_[A-Za-z0-9]+/g, "whsec_[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]");
}
