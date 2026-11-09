import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendOrderConfirmationEmail } from "../_shared/order-confirm-email.ts";
import {
  CONNECT_API_BASE,
  CONNECT_RETURN_ORIGIN,
  connectAmountHtg,
  connectIdempotencyKey,
  connectPaymentUrl,
  connectReferenceId,
  connectReturnUrl,
  decideConnectStatus,
  parseConnectWebhookEvent,
  redactConnectSecrets,
  verifyConnectWebhookSignature,
} from "../_shared/moncash-connect.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://klirline-store.pages.dev,https://store.klirline.com,https://klirline.com,https://www.klirline.com,http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    Vary: "Origin",
  };
}

function json(status: number, body: Record<string, unknown>, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type Admin = SupabaseClient;

type OrderRow = {
  id: string;
  user_id: string | null;
  total: number | string;
  status: string;
  guest_token: string | null;
  payment_method: string | null;
  payment_currency: string | null;
  moncash_order_id: string | null;
  moncash_transaction_id: string | null;
  moncash_amount_htg: number | null;
};

const ORDER_COLUMNS =
  "id, user_id, total, status, guest_token, payment_method, payment_currency, moncash_order_id, moncash_transaction_id, moncash_amount_htg";

function connectSecret(): string {
  return Deno.env.get("MONCASH_CONNECT_SECRET_KEY")?.trim() ?? "";
}

function webhookSecret(): string {
  return Deno.env.get("MONCASH_CONNECT_WEBHOOK_SECRET")?.trim() ?? "";
}

function connectOrigin(): string {
  const raw = Deno.env.get("MONCASH_CONNECT_ORIGIN")?.trim() || CONNECT_RETURN_ORIGIN;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return CONNECT_RETURN_ORIGIN;
    return url.origin;
  } catch {
    return CONNECT_RETURN_ORIGIN;
  }
}

async function optionalUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt || jwt === Deno.env.get("SUPABASE_ANON_KEY")) return null;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

function assertOrderAccess(
  order: { user_id: string | null; guest_token?: string | null },
  user: { id: string } | null,
  guestToken?: string | null,
): boolean {
  if (user && order.user_id === user.id) return true;
  if (guestToken && order.guest_token && guestToken === order.guest_token && !order.user_id) {
    return true;
  }
  return false;
}

async function loadOrder(admin: Admin, orderId: string): Promise<OrderRow | null> {
  const { data, error } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return data as OrderRow;
}

function expectedAmount(order: OrderRow): number | null {
  const parsed = connectAmountHtg(order.moncash_amount_htg ?? order.total);
  if (!parsed.ok) return null;
  if (order.moncash_amount_htg != null && order.moncash_amount_htg !== parsed.amount) return null;
  return parsed.amount;
}

type PayStatus =
  | { kind: "ok"; reference: string; status: string; amount: number }
  | { kind: "absent" }
  | { kind: "auth" }
  | { kind: "unavailable" };

async function fetchPayStatus(referenceId: string): Promise<PayStatus> {
  const secret = connectSecret();
  if (!secret) return { kind: "auth" };
  let res: Response;
  try {
    const url = new URL(`${CONNECT_API_BASE}/pay-status`);
    url.searchParams.set("referenceId", referenceId);
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
        Origin: connectOrigin(),
      },
    });
  } catch (err) {
    console.error("connect pay-status", redactConnectSecrets(err instanceof Error ? err.message : "network"));
    return { kind: "unavailable" };
  }
  if (res.status === 404) return { kind: "absent" };
  if (res.status === 401 || res.status === 403) {
    console.error("connect pay-status http", res.status);
    return { kind: "auth" };
  }
  if (!res.ok) {
    console.error("connect pay-status http", res.status);
    return { kind: "unavailable" };
  }
  let body: Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    return { kind: "unavailable" };
  }
  if (typeof body.reference !== "string" || typeof body.status !== "string") {
    return { kind: "unavailable" };
  }
  if (typeof body.amount !== "number" || !Number.isInteger(body.amount)) {
    return { kind: "unavailable" };
  }
  return { kind: "ok", reference: body.reference, status: body.status, amount: body.amount };
}

async function runSideEffects(admin: Admin, orderId: string) {
  const { error: fulfillErr } = await admin.rpc("create_order_fulfillments", {
    p_order_id: orderId,
  });
  if (fulfillErr) console.error("create_order_fulfillments failed", fulfillErr.message);
  try {
    const mail = await sendOrderConfirmationEmail(admin, orderId);
    if (!mail.sent) console.log("order confirm email skipped", mail.reason);
  } catch (err) {
    console.error("order confirm email failed", redactConnectSecrets(err instanceof Error ? err.message : "email"));
  }
}

async function settleCompleted(
  admin: Admin,
  order: OrderRow,
  amount: number,
): Promise<"settled" | "already" | "rejected"> {
  if (order.status === "completed" && (!order.payment_method || order.payment_method === "moncash")) {
    return "already";
  }
  if (order.status !== "pending") return "rejected";
  const { data: updated, error } = await admin
    .from("orders")
    .update({
      status: "completed",
      payment_method: "moncash",
      payment_currency: "HTG",
      moncash_order_id: order.id,
      moncash_amount_htg: amount,
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");
  if (error) {
    console.error("connect settle", error.code);
    throw new Error("connect_settle");
  }
  if (Array.isArray(updated) && updated.length === 1) {
    await runSideEffects(admin, order.id);
    return "settled";
  }
  const reread = await loadOrder(admin, order.id);
  if (reread?.status === "completed") return "already";
  return "rejected";
}

async function markFailed(admin: Admin, order: OrderRow): Promise<void> {
  if (order.status !== "pending") return;
  await admin
    .from("orders")
    .update({ payment_method: "moncash", payment_currency: "HTG" })
    .eq("id", order.id)
    .eq("status", "pending");
  await admin
    .from("orders")
    .update({ status: "failed" })
    .eq("id", order.id)
    .eq("status", "pending");
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const path = new URL(req.url).pathname.replace(/\/$/, "") || "/";
  const isWebhook = path === "/webhook" || path.endsWith("/webhook") || path === "/notify" || path.endsWith("/notify");
  const isCreate = path === "/create" || path.endsWith("/create");
  const isVerify = path === "/verify" || path.endsWith("/verify");

  try {
    if (isWebhook) return await handleWebhook(req, cors);
    if (req.method !== "POST" || (!isCreate && !isVerify)) {
      return json(404, { error: "Not found" }, cors);
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const user = await optionalUser(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json(400, { error: "Requête invalide" }, cors);
    const payload = body as { orderId?: unknown; guestToken?: unknown };
    const guestToken = typeof payload.guestToken === "string" ? payload.guestToken : null;
    if (isCreate) return await handleCreate(admin, user, payload.orderId, guestToken, cors);
    return await handleVerify(admin, user, payload.orderId, guestToken, cors);
  } catch (err) {
    console.error("connect handler", redactConnectSecrets(err instanceof Error ? err.message : "error").slice(0, 200));
    return json(500, { error: "Paiement MonCash indisponible." }, cors);
  }
});

async function handleWebhook(req: Request, cors: Record<string, string>) {
  if (req.method === "GET") {
    return Response.redirect(`${CONNECT_RETURN_ORIGIN}/?checkout=moncash_return`, 302);
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const rawBody = await req.text();
  const verified = await verifyConnectWebhookSignature({
    rawBody,
    signature: req.headers.get("X-MCC-Signature"),
    signatureV2: req.headers.get("X-MCC-Signature-V2"),
    timestamp: req.headers.get("X-MCC-Timestamp"),
    secret: webhookSecret(),
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  if (!verified.ok) {
    console.error("connect webhook", verified.reason);
    return json(verified.reason === "secret" ? 503 : 401, { received: false }, cors);
  }

  const event = parseConnectWebhookEvent(rawBody);
  if (!event) return json(200, { received: true, settled: false }, cors);
  if (event.event !== "payment.completed" && event.event !== "payment.failed") {
    return json(200, { received: true, settled: false }, cors);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const order = await loadOrder(admin, event.reference);
  if (!order || (order.payment_method && order.payment_method !== "moncash")) {
    return json(200, { received: true, settled: false }, cors);
  }
  const expected = expectedAmount(order);
  if (expected == null) return json(200, { received: true, settled: false }, cors);

  const status = await fetchPayStatus(order.id);
  if (status.kind === "auth" || status.kind === "unavailable") {
    return json(503, { received: true, settled: false }, cors);
  }
  if (status.kind !== "ok") return json(200, { received: true, settled: false }, cors);

  const decision = decideConnectStatus({
    reference: status.reference,
    status: status.status,
    amount: status.amount,
    expectedReference: order.id,
    expectedAmount: expected,
  });
  if (decision === "settle") {
    const result = await settleCompleted(admin, order, expected);
    return json(200, { received: true, settled: result !== "rejected" }, cors);
  }
  if (decision === "failed" && event.event === "payment.failed") {
    await markFailed(admin, order);
  }
  return json(200, { received: true, settled: false }, cors);
}

async function handleCreate(
  admin: Admin,
  user: { id: string } | null,
  rawOrderId: unknown,
  guestToken: string | null,
  cors: Record<string, string>,
) {
  if (typeof rawOrderId !== "string" || !connectReferenceId(rawOrderId)) {
    return json(400, { error: "orderId is required" }, cors);
  }
  const order = await loadOrder(admin, rawOrderId);
  if (!order) return json(404, { error: "Order not found" }, cors);
  if (!assertOrderAccess(order, user, guestToken)) return json(403, { error: "Forbidden" }, cors);
  if (order.payment_method && order.payment_method !== "moncash") {
    return json(400, { error: "Cette commande n'est pas un paiement MonCash." }, cors);
  }
  if (order.payment_currency && order.payment_currency !== "HTG") {
    return json(400, { error: "MonCash Connect n'accepte que le HTG." }, cors);
  }
  if (order.status === "completed") return json(200, { alreadySettled: true, orderId: order.id }, cors);
  if (order.status !== "pending") return json(400, { error: "Order is not pending" }, cors);

  const amount = connectAmountHtg(order.total);
  if (!amount.ok) {
    const error = amount.reason === "above_documented_max"
      ? "MonCash Connect accepte un montant entier de 1 à 100 000 HTG."
      : "MonCash Connect n'accepte qu'un montant entier en HTG.";
    return json(400, { error }, cors);
  }
  const returnUrl = connectReturnUrl(order.id, connectOrigin());
  const idempotencyKey = connectIdempotencyKey(order.id);
  if (!returnUrl || !idempotencyKey) return json(400, { error: "Commande invalide" }, cors);

  const existing = await fetchPayStatus(order.id);
  if (existing.kind === "ok") {
    const decision = decideConnectStatus({
      reference: existing.reference,
      status: existing.status,
      amount: existing.amount,
      expectedReference: order.id,
      expectedAmount: amount.amount,
    });
    if (decision === "settle") {
      await settleCompleted(admin, order, amount.amount);
      return json(200, { alreadySettled: true, orderId: order.id }, cors);
    }
    if (decision === "mismatch") {
      return json(409, { error: "Le montant MonCash ne correspond pas à la commande." }, cors);
    }
    if (decision === "failed") {
      return json(400, { error: "Paiement MonCash non confirmé." }, cors);
    }
  }
  if (existing.kind === "auth" || existing.kind === "unavailable") {
    return json(503, { error: "Paiement MonCash indisponible." }, cors);
  }

  const secret = connectSecret();
  if (!secret) return json(503, { error: "Paiement MonCash indisponible." }, cors);
  let res: Response;
  try {
    res = await fetch(`${CONNECT_API_BASE}/pay-create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: connectOrigin(),
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: amount.amount,
        referenceId: order.id,
        returnUrl,
      }),
    });
  } catch (err) {
    console.error("connect pay-create", redactConnectSecrets(err instanceof Error ? err.message : "network"));
    return json(503, { error: "Paiement MonCash indisponible." }, cors);
  }
  if (res.status === 409 || res.status === 410) {
    return json(409, { error: "Un paiement MonCash est déjà ouvert pour cette commande." }, cors);
  }
  if (!res.ok) {
    console.error("connect pay-create http", res.status);
    return json(503, { error: "Paiement MonCash indisponible." }, cors);
  }
  let created: Record<string, unknown>;
  try {
    created = await res.json();
  } catch {
    return json(502, { error: "Paiement MonCash indisponible." }, cors);
  }
  if (created.reference !== order.id) {
    console.error("connect pay-create reference mismatch");
    return json(502, { error: "Paiement MonCash indisponible." }, cors);
  }
  const paymentUrl = connectPaymentUrl(created.paymentUrl);
  if (!paymentUrl) {
    console.error("connect pay-create undocumented payment host");
    return json(502, { error: "Paiement MonCash indisponible." }, cors);
  }

  const { data: marked, error: markErr } = await admin
    .from("orders")
    .update({
      moncash_order_id: order.id,
      moncash_amount_htg: amount.amount,
      payment_currency: "HTG",
      payment_method: "moncash",
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");
  if (markErr || !Array.isArray(marked) || marked.length !== 1) {
    return json(409, { error: "Order is not pending" }, cors);
  }
  return json(200, { paymentUrl }, cors);
}

async function handleVerify(
  admin: Admin,
  user: { id: string } | null,
  rawOrderId: unknown,
  guestToken: string | null,
  cors: Record<string, string>,
) {
  if (typeof rawOrderId !== "string" || !connectReferenceId(rawOrderId)) {
    return json(400, { error: "orderId is required" }, cors);
  }
  const order = await loadOrder(admin, rawOrderId);
  if (!order) return json(404, { error: "Order not found" }, cors);
  if (!assertOrderAccess(order, user, guestToken)) return json(403, { error: "Forbidden" }, cors);
  if (order.status === "completed" && (!order.payment_method || order.payment_method === "moncash")) {
    return json(200, { success: true, alreadyCompleted: true, orderId: order.id }, cors);
  }
  const expected = expectedAmount(order);
  if (expected == null) {
    return json(400, { success: false, error: "MonCash Connect n'accepte qu'un montant entier en HTG." }, cors);
  }
  const status = await fetchPayStatus(order.id);
  if (status.kind === "auth" || status.kind === "unavailable") {
    return json(503, { success: false, error: "Paiement MonCash indisponible." }, cors);
  }
  if (status.kind !== "ok") {
    return json(400, { success: false, error: "Paiement MonCash non confirmé." }, cors);
  }
  const decision = decideConnectStatus({
    reference: status.reference,
    status: status.status,
    amount: status.amount,
    expectedReference: order.id,
    expectedAmount: expected,
  });
  if (decision === "settle") {
    const result = await settleCompleted(admin, order, expected);
    if (result === "rejected") {
      return json(409, { success: false, error: "Cette commande ne peut plus être payée." }, cors);
    }
    return json(200, { success: true, alreadyCompleted: result === "already", orderId: order.id }, cors);
  }
  if (decision === "mismatch") {
    return json(409, { success: false, error: "Le montant MonCash ne correspond pas à la commande." }, cors);
  }
  return json(400, { success: false, error: "Paiement MonCash non confirmé." }, cors);
}
