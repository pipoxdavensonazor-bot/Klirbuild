/**
 * MonCash (Digicel) decision helpers — no secrets, no I/O.
 *
 * Official REST API (sandbox doc, fetched 2026-11-09):
 * https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/resources/doc/RestAPI_MonCash_doc.pdf
 *
 * That PDF documents oauth, CreatePayment, RetrieveOrderPayment and
 * RetrieveTransactionPayment. It does not document a webhook signature,
 * a webhook secret, or a currency field. Amounts in the samples are HTG.
 * Confirmation is the Retrieve* response (`payment.message === "successful"`),
 * never the browser return query.
 *
 * Button doc (older, encrypted button — not the protocol this function calls):
 * https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/resources/doc/MC_Button_Doc.pdf
 * Return URL receives `transactionId` by HTTP GET. Alert URL is the thank-you page.
 */

export const KLIRLINE_SUPABASE_URL = "https://whybbqeeqpkbkatnkjjc.supabase.co";
export const MONCASH_NOTIFY_PATH = "/functions/v1/moncash-payment/notify";
export const MONCASH_ALERT_URL = "https://klirline.com/?checkout=moncash_return";

export function moncashCancelUrl(): string {
  const url = new URL(MONCASH_ALERT_URL);
  url.searchParams.set("checkout", "moncash_cancel");
  return url.toString();
}
export const MONCASH_CURRENCY = "HTG";

const TRANSACTION_ID = /^[0-9]{4,32}$/;
const ORDER_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MoncashEnv = "sandbox" | "live";

export function moncashEnvironment(raw: string | undefined | null): MoncashEnv {
  return raw === "live" ? "live" : "sandbox";
}

/**
 * Versements vendeurs. Ne lit jamais MONCASH_ENV : passer l'encaissement en
 * live ne doit pas envoyer POST /v1/Transfert sur l'hôte de production.
 */
export function moncashPayoutEnvironment(raw: string | undefined | null): MoncashEnv {
  return raw === "live" ? "live" : "sandbox";
}

export type PayoutCredentialDecision =
  | { ok: true; clientId: string; clientSecret: string; source: "payout" | "checkout_sandbox_fallback" }
  | { ok: false; reason: "missing" | "live_requires_dedicated" };

/**
 * Live payouts require their own client id/secret. Sandbox payouts may keep
 * using the current checkout pair so an unchanged sandbox deployment still
 * works. Checkout live credentials are never selected for a live transfer.
 */
export function resolvePayoutCredentials(input: {
  payoutEnv: MoncashEnv;
  payoutClientId?: string | null;
  payoutClientSecret?: string | null;
  checkoutClientId?: string | null;
  checkoutClientSecret?: string | null;
}): PayoutCredentialDecision {
  const payoutId = input.payoutClientId?.trim() ?? "";
  const payoutSecret = input.payoutClientSecret?.trim() ?? "";
  if (payoutId && payoutSecret) {
    return {
      ok: true,
      clientId: payoutId,
      clientSecret: payoutSecret,
      source: "payout",
    };
  }
  if (input.payoutEnv === "live") {
    return { ok: false, reason: "live_requires_dedicated" };
  }
  const checkoutId = input.checkoutClientId?.trim() ?? "";
  const checkoutSecret = input.checkoutClientSecret?.trim() ?? "";
  if (checkoutId && checkoutSecret) {
    return {
      ok: true,
      clientId: checkoutId,
      clientSecret: checkoutSecret,
      source: "checkout_sandbox_fallback",
    };
  }
  return { ok: false, reason: "missing" };
}

export function moncashHosts(env: MoncashEnv): { rest: string; gateway: string } {
  if (env === "live") {
    return {
      rest: "https://moncashbutton.digicelgroup.com/Api",
      gateway: "https://moncashbutton.digicelgroup.com/Moncash-middleware",
    };
  }
  return {
    rest: "https://sandbox.moncashbutton.digicelgroup.com/Api",
    gateway: "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware",
  };
}

/** Exact notify URL for the live KlirlineCore project. */
export function moncashNotifyUrl(supabaseUrl?: string | null): string {
  const base = (supabaseUrl && supabaseUrl.trim()
    ? supabaseUrl.trim()
    : KLIRLINE_SUPABASE_URL
  ).replace(/\/$/, "");
  return `${base}${MONCASH_NOTIFY_PATH}`;
}

/**
 * Whole gourdes. The REST samples send a numeric amount and community SDKs
 * type it as an integer. There is no documented FX conversion.
 */
export function moncashAmountHtg(
  total: unknown,
): { ok: true; amount: number } | { ok: false; reason: "invalid" | "not_integer" } {
  const n = typeof total === "number"
    ? total
    : typeof total === "string" && total.trim() !== ""
    ? Number(total)
    : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "invalid" };
  const amount = Math.round(n);
  if (Math.abs(n - amount) > 0.001) return { ok: false, reason: "not_integer" };
  if (!Number.isSafeInteger(amount)) return { ok: false, reason: "invalid" };
  return { ok: true, amount };
}

export function orderCurrencyIsHtg(currency: unknown): boolean {
  return currency == null || currency === MONCASH_CURRENCY;
}

export function amountsMatch(paid: unknown, expected: number): boolean {
  const n = typeof paid === "number"
    ? paid
    : typeof paid === "string" && paid.trim() !== ""
    ? Number(paid)
    : Number.NaN;
  return Number.isFinite(n) && Math.abs(n - expected) < 0.001;
}

export function expectedMoncashAmount(order: {
  total: unknown;
  moncashAmountHtg: number | null;
}): { ok: true; amount: number } | { ok: false; reason: "invalid" | "not_integer" | "amount_mismatch" } {
  const fromTotal = moncashAmountHtg(order.total);
  if (!fromTotal.ok) return fromTotal;
  if (order.moncashAmountHtg == null) return fromTotal;
  if (!Number.isSafeInteger(order.moncashAmountHtg) || order.moncashAmountHtg <= 0) {
    return { ok: false, reason: "invalid" };
  }
  if (order.moncashAmountHtg !== fromTotal.amount) {
    return { ok: false, reason: "amount_mismatch" };
  }
  return { ok: true, amount: order.moncashAmountHtg };
}

export type MoncashPaymentView = {
  reference?: unknown;
  transaction_id?: unknown;
  cost?: unknown;
  message?: unknown;
};

export type OrderPaymentState = {
  id: string;
  status: string;
  total: unknown;
  paymentMethod: string | null;
  paymentCurrency: string | null;
  moncashOrderId: string | null;
  moncashTransactionId: string | null;
  moncashAmountHtg: number | null;
};

export type RejectReason =
  | "not_successful"
  | "amount_mismatch"
  | "currency"
  | "order_mismatch"
  | "method"
  | "duplicate_transaction"
  | "missing_transaction"
  | "not_payable"
  | "not_integer";

export type SettleDecision =
  | { action: "settle"; transactionId: string; amount: number }
  | { action: "already" }
  | { action: "reject"; reason: RejectReason };

function asId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  return null;
}

/**
 * Paid only when Retrieve* says successful AND reference, integer HTG cost,
 * currency and order line up. A transaction id by itself is not a decision.
 */
export function decideMoncashSettlement(
  order: OrderPaymentState,
  payment: MoncashPaymentView | null | undefined,
): SettleDecision {
  if (order.paymentMethod && order.paymentMethod !== "moncash") {
    return { action: "reject", reason: "method" };
  }
  if (!orderCurrencyIsHtg(order.paymentCurrency)) {
    return { action: "reject", reason: "currency" };
  }

  const expected = expectedMoncashAmount(order);
  if (!expected.ok) {
    return {
      action: "reject",
      reason: expected.reason === "amount_mismatch" ? "amount_mismatch" : "not_integer",
    };
  }

  const message = typeof payment?.message === "string" ? payment.message.trim() : "";
  const reference = asId(payment?.reference);
  const transactionId = asId(payment?.transaction_id);
  const successful = message === "successful";
  const sameOrder = reference === order.id &&
    (!order.moncashOrderId || order.moncashOrderId === order.id);
  const sameAmount = amountsMatch(payment?.cost, expected.amount);

  if (order.status === "completed") {
    if (!successful || !sameOrder) {
      return { action: "reject", reason: sameOrder ? "not_successful" : "order_mismatch" };
    }
    if (!sameAmount) return { action: "reject", reason: "amount_mismatch" };
    if (
      transactionId &&
      order.moncashTransactionId &&
      transactionId !== order.moncashTransactionId
    ) {
      return { action: "reject", reason: "duplicate_transaction" };
    }
    return { action: "already" };
  }

  if (order.status !== "pending") {
    return { action: "reject", reason: "not_payable" };
  }
  if (!successful) return { action: "reject", reason: "not_successful" };
  if (!sameOrder) return { action: "reject", reason: "order_mismatch" };
  if (!sameAmount) return { action: "reject", reason: "amount_mismatch" };
  if (!transactionId || !TRANSACTION_ID.test(transactionId)) {
    return { action: "reject", reason: "missing_transaction" };
  }
  return { action: "settle", transactionId, amount: expected.amount };
}

export function interpretSettleRace(
  updatedRow: boolean,
  reread: { status: string; moncashTransactionId: string | null } | null,
  transactionId: string,
): "settled" | "already" | "duplicate" | "lost" {
  if (updatedRow) return "settled";
  if (reread?.status === "completed") {
    if (!reread.moncashTransactionId || reread.moncashTransactionId === transactionId) {
      return "already";
    }
    return "duplicate";
  }
  return "lost";
}

export function normalizeTransactionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return TRANSACTION_ID.test(trimmed) ? trimmed : null;
}

export function isOrderUuid(value: unknown): value is string {
  return typeof value === "string" && ORDER_UUID.test(value);
}

/** Browser/notify query is an identifier only. It never means paid. */
export async function readNotifyTransactionId(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const fromQuery = normalizeTransactionId(url.searchParams.get("transactionId"));
  if (fromQuery) return fromQuery;
  if (req.method !== "POST") return null;
  const text = await req.text();
  if (text.length > 4096) return null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = JSON.parse(text) as { transactionId?: unknown };
      return normalizeTransactionId(body?.transactionId);
    } catch {
      return null;
    }
  }
  const params = new URLSearchParams(text);
  return normalizeTransactionId(params.get("transactionId"));
}

export function isSafePaymentToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9+/=._~-]{8,2048}$/.test(token);
}

export function paymentRedirectUrl(gatewayBase: string, token: string): string | null {
  if (!isSafePaymentToken(token)) return null;
  return `${gatewayBase.replace(/\/$/, "")}/Payment/Redirect?token=${encodeURIComponent(token)}`;
}

/**
 * CreatePayment may include `mode`. Empty/absent is allowed (the PDF sample
 * leaves it blank). A contradictory mode aborts the redirect.
 */
export function gatewayModeMatches(mode: unknown, env: MoncashEnv): boolean {
  if (mode == null) return true;
  if (typeof mode !== "string") return false;
  const value = mode.trim().toLowerCase();
  if (!value) return true;
  if (env === "live") return value === "live" || value === "production" || value === "prod";
  return value === "sandbox" || value === "test";
}

export function alertRedirect(orderId: string | null, transactionId: string | null): string {
  const url = new URL(MONCASH_ALERT_URL);
  if (orderId && isOrderUuid(orderId)) url.searchParams.set("order_id", orderId);
  const tx = normalizeTransactionId(transactionId);
  if (tx) url.searchParams.set("transactionId", tx);
  return url.toString();
}

export function redactSensitive(text: string): string {
  return text
    .replace(/client_secret(=|:)\s*[^&\s"']+/gi, "client_secret$1[redacted]")
    .replace(/client_id(=|:)\s*[^&\s"']+/gi, "client_id$1[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [redacted]")
    .replace(/("(?:access_token|token)"\s*:\s*")[^"]+/gi, '$1[redacted]');
}
