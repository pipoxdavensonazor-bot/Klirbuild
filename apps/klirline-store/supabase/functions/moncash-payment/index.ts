import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendOrderConfirmationEmail } from "../_shared/order-confirm-email.ts";
import {
  alertRedirect,
  moncashCancelUrl,
  decideMoncashSettlement,
  gatewayModeMatches,
  interpretSettleRace,
  isOrderUuid,
  moncashAmountHtg,
  moncashEnvironment,
  moncashHosts,
  orderCurrencyIsHtg,
  paymentRedirectUrl,
  readNotifyTransactionId,
  redactSensitive,
  type MoncashPaymentView,
  type OrderPaymentState,
  type RejectReason,
} from "../_shared/moncash-protocol.ts";

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

function toState(order: OrderRow): OrderPaymentState {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    paymentMethod: order.payment_method,
    paymentCurrency: order.payment_currency,
    moncashOrderId: order.moncash_order_id,
    moncashTransactionId: order.moncash_transaction_id,
    moncashAmountHtg: order.moncash_amount_htg,
  };
}

function hosts() {
  return moncashHosts(moncashEnvironment(Deno.env.get("MONCASH_ENV")));
}

async function getMoncashToken(): Promise<string> {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    console.error("moncash credentials missing");
    throw new Error("moncash_unconfigured");
  }

  const { rest } = hosts();
  const res = await fetch(`${rest}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=read,write&grant_type=client_credentials",
  });
  if (!res.ok) {
    console.error("moncash auth http", res.status);
    throw new Error("moncash_auth");
  }
  const data = await res.json();
  if (typeof data?.access_token !== "string" || !data.access_token) {
    console.error("moncash auth missing access_token");
    throw new Error("moncash_auth");
  }
  return data.access_token as string;
}

type Upstream =
  | { kind: "ok"; body: Record<string, unknown> }
  | { kind: "absent" }
  | { kind: "auth" }
  | { kind: "unavailable" };

async function moncashPost(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<Upstream> {
  const { rest } = hosts();
  let res: Response;
  try {
    res = await fetch(`${rest}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(
      "moncash fetch",
      path,
      redactSensitive(err instanceof Error ? err.message : "network").slice(0, 180),
    );
    return { kind: "unavailable" };
  }

  if (res.status === 401 || res.status === 403) {
    console.error("moncash http", path, res.status);
    return { kind: "auth" };
  }
  if (res.status === 400 || res.status === 404) {
    console.error("moncash absent", path, res.status);
    return { kind: "absent" };
  }
  if (!res.ok) {
    console.error("moncash http", path, res.status);
    return { kind: "unavailable" };
  }

  try {
    const parsed = await res.json();
    if (!parsed || typeof parsed !== "object") return { kind: "unavailable" };
    return { kind: "ok", body: parsed as Record<string, unknown> };
  } catch {
    console.error("moncash invalid json", path);
    return { kind: "unavailable" };
  }
}

function paymentOf(body: Record<string, unknown> | null): MoncashPaymentView | null {
  const payment = body?.payment;
  if (!payment || typeof payment !== "object") return null;
  return payment as MoncashPaymentView;
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

const USER_ERRORS: Record<RejectReason, string> = {
  not_successful: "Paiement MonCash non confirmé.",
  amount_mismatch: "Le montant MonCash ne correspond pas à la commande.",
  currency: "MonCash n'accepte que le HTG.",
  order_mismatch: "La référence MonCash ne correspond pas à la commande.",
  method: "Cette commande n'est pas un paiement MonCash.",
  duplicate_transaction: "Cette transaction MonCash est déjà enregistrée.",
  missing_transaction: "Paiement MonCash non confirmé.",
  not_payable: "Cette commande ne peut plus être payée.",
  not_integer: "MonCash n'accepte qu'un montant entier en HTG.",
};

async function runSideEffects(admin: Admin, orderId: string) {
  const { error: fulfillErr } = await admin.rpc("create_order_fulfillments", {
    p_order_id: orderId,
  });
  if (fulfillErr) console.error("create_order_fulfillments failed", fulfillErr.message);

  try {
    const mail = await sendOrderConfirmationEmail(admin, orderId);
    if (!mail.sent) console.log("order confirm email skipped", mail.reason);
  } catch (err) {
    console.error(
      "order confirm email failed",
      redactSensitive(err instanceof Error ? err.message : "email").slice(0, 180),
    );
  }
}

/** Only the request that flips pending → completed runs fulfillment and email. */
async function settle(
  admin: Admin,
  order: OrderRow,
  payment: MoncashPaymentView | null,
): Promise<{ outcome: "settled" | "already" | "reject"; reason?: RejectReason }> {
  const decision = decideMoncashSettlement(toState(order), payment);
  if (decision.action === "reject") return { outcome: "reject", reason: decision.reason };
  if (decision.action === "already") return { outcome: "already" };

  const { data: updated, error: upErr } = await admin
    .from("orders")
    .update({
      status: "completed",
      payment_method: "moncash",
      payment_currency: "HTG",
      moncash_order_id: order.id,
      moncash_transaction_id: decision.transactionId,
      moncash_amount_htg: decision.amount,
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .is("moncash_transaction_id", null)
    .select("id");

  if (upErr) {
    if (upErr.code === "23505") {
      console.error("moncash duplicate transaction", order.id, decision.transactionId);
      return { outcome: "reject", reason: "duplicate_transaction" };
    }
    console.error("moncash settle", upErr.code);
    throw new Error("moncash_settle");
  }

  if (Array.isArray(updated) && updated.length === 1) {
    await runSideEffects(admin, order.id);
    return { outcome: "settled" };
  }

  const reread = await loadOrder(admin, order.id);
  const race = interpretSettleRace(
    false,
    reread
      ? { status: reread.status, moncashTransactionId: reread.moncash_transaction_id }
      : null,
    decision.transactionId,
  );
  if (race === "already") return { outcome: "already" };
  if (race === "duplicate") {
    console.error("moncash duplicate transaction", order.id, decision.transactionId);
    return { outcome: "reject", reason: "duplicate_transaction" };
  }
  return { outcome: "reject", reason: "not_payable" };
}

function userResult(
  cors: Record<string, string>,
  result: { outcome: "settled" | "already" | "reject"; reason?: RejectReason },
  orderId: string,
) {
  if (result.outcome === "reject") {
    const reason = result.reason ?? "not_successful";
    const status = reason === "not_successful" || reason === "missing_transaction" ? 400 : 409;
    return json(status, { success: false, error: USER_ERRORS[reason] }, cors);
  }
  return json(200, {
    success: true,
    alreadyCompleted: result.outcome === "already",
    orderId,
  }, cors);
}

Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const path = new URL(req.url).pathname.replace(/\/$/, "") || "/";
  const isNotify = path === "/notify" || path.endsWith("/notify");
  const isCreate = path === "/create" || path.endsWith("/create");
  const isVerify = path === "/verify" || path.endsWith("/verify");

  try {
    if (isNotify) return await handleNotify(req, cors);
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
    const payload = body as { orderId?: unknown; guestToken?: unknown; transactionId?: unknown };
    const guestToken = typeof payload.guestToken === "string" ? payload.guestToken : null;

    if (isCreate) return await handleCreate(admin, user, payload.orderId, guestToken, cors);
    const transactionId = typeof payload.transactionId === "string" ? payload.transactionId : null;
    return await handleVerify(admin, user, payload.orderId, guestToken, transactionId, cors);
  } catch (err) {
    const message = redactSensitive(err instanceof Error ? err.message : "error");
    console.error("moncash handler", message.slice(0, 200));
    const unavailable = message === "moncash_unconfigured" || message === "moncash_auth";
    return json(unavailable ? 503 : 500, { error: "Paiement MonCash indisponible." }, cors);
  }
});

async function handleNotify(req: Request, cors: Record<string, string>) {
  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, cors);
  }

  const transactionId = await readNotifyTransactionId(req);
  const browser = req.method === "GET";
  if (!transactionId) {
    if (browser) return Response.redirect(moncashCancelUrl(), 302);
    return json(400, { received: true, settled: false }, cors);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const token = await getMoncashToken();
  const upstream = await moncashPost("/v1/RetrieveTransactionPayment", token, { transactionId });
  if (upstream.kind !== "ok") {
    if (browser) return Response.redirect(alertRedirect(null, transactionId), 302);
    const status = upstream.kind === "absent" ? 200 : 503;
    return json(status, { received: true, settled: false }, cors);
  }

  const reference = paymentOf(upstream.body)?.reference;
  const orderId = typeof reference === "string" ? reference.trim() : "";
  const order = isOrderUuid(orderId) ? await loadOrder(admin, orderId) : null;
  if (!order) {
    console.error("moncash notify unknown reference");
    if (browser) return Response.redirect(alertRedirect(null, transactionId), 302);
    return json(200, { received: true, settled: false }, cors);
  }

  const result = await settle(admin, order, paymentOf(upstream.body));
  if (browser) {
    const target = result.outcome === "reject"
      ? alertRedirect(null, transactionId)
      : alertRedirect(order.id, transactionId);
    return Response.redirect(target, 302);
  }
  if (result.outcome === "reject") return json(200, { received: true, settled: false }, cors);
  return json(200, {
    received: true,
    settled: true,
    alreadyCompleted: result.outcome === "already",
  }, cors);
}

async function handleCreate(
  admin: Admin,
  user: { id: string } | null,
  rawOrderId: unknown,
  guestToken: string | null,
  cors: Record<string, string>,
) {
  if (typeof rawOrderId !== "string" || !isOrderUuid(rawOrderId)) {
    return json(400, { error: "orderId is required" }, cors);
  }
  const order = await loadOrder(admin, rawOrderId);
  if (!order) return json(404, { error: "Order not found" }, cors);
  if (!assertOrderAccess(order, user, guestToken)) return json(403, { error: "Forbidden" }, cors);
  if (order.payment_method && order.payment_method !== "moncash") {
    return json(400, { error: USER_ERRORS.method }, cors);
  }
  if (!orderCurrencyIsHtg(order.payment_currency)) {
    return json(400, { error: USER_ERRORS.currency }, cors);
  }
  if (order.status === "completed") return json(200, { alreadySettled: true, orderId: order.id }, cors);
  if (order.status !== "pending") return json(400, { error: "Order is not pending" }, cors);

  const amount = moncashAmountHtg(order.total);
  if (!amount.ok) return json(400, { error: USER_ERRORS.not_integer }, cors);
  if (order.moncash_amount_htg != null && order.moncash_amount_htg !== amount.amount) {
    return json(409, { error: USER_ERRORS.amount_mismatch }, cors);
  }

  const token = await getMoncashToken();
  const existing = await moncashPost("/v1/RetrieveOrderPayment", token, { orderId: order.id });
  if (existing.kind === "auth") throw new Error("moncash_auth");
  if (existing.kind === "unavailable") throw new Error("moncash_unavailable");
  if (existing.kind === "ok" && paymentOf(existing.body)?.message === "successful") {
    const settled = await settle(admin, order, paymentOf(existing.body));
    if (settled.outcome === "reject") return userResult(cors, settled, order.id);
    return json(200, { alreadySettled: true, orderId: order.id }, cors);
  }

  const created = await moncashPost("/v1/CreatePayment", token, {
    amount: amount.amount,
    orderId: order.id,
  });
  if (created.kind !== "ok") {
    throw new Error(created.kind === "auth" ? "moncash_auth" : "moncash_create");
  }

  const env = moncashEnvironment(Deno.env.get("MONCASH_ENV"));
  if (!gatewayModeMatches(created.body.mode, env)) {
    console.error("moncash mode mismatch", env);
    return json(502, { error: "Paiement MonCash indisponible." }, cors);
  }

  const tokenBag = created.body.payment_token;
  const rawToken = tokenBag && typeof tokenBag === "object"
    ? (tokenBag as { token?: unknown }).token
    : null;
  const paymentUrl = paymentRedirectUrl(hosts().gateway, typeof rawToken === "string" ? rawToken : "");
  if (!paymentUrl) {
    console.error("moncash create missing token");
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
    console.error("moncash create mark", markErr?.code ?? "no_row");
    return json(409, { error: "Order is not pending" }, cors);
  }

  return json(200, { paymentUrl }, cors);
}

async function handleVerify(
  admin: Admin,
  user: { id: string } | null,
  rawOrderId: unknown,
  guestToken: string | null,
  rawTransactionId: string | null,
  cors: Record<string, string>,
) {
  if (typeof rawOrderId === "string" && isOrderUuid(rawOrderId)) {
    const order = await loadOrder(admin, rawOrderId);
    if (!order) return json(404, { error: "Order not found" }, cors);
    if (!assertOrderAccess(order, user, guestToken)) return json(403, { error: "Forbidden" }, cors);
    if (order.status === "completed" && (!order.payment_method || order.payment_method === "moncash")) {
      return json(200, { success: true, alreadyCompleted: true, orderId: order.id }, cors);
    }

    const token = await getMoncashToken();
    const upstream = await moncashPost("/v1/RetrieveOrderPayment", token, { orderId: order.id });
    if (upstream.kind === "auth") throw new Error("moncash_auth");
    if (upstream.kind === "unavailable") throw new Error("moncash_unavailable");
    const payment = upstream.kind === "ok" ? paymentOf(upstream.body) : null;
    if (
      rawTransactionId &&
      payment?.transaction_id != null &&
      String(payment.transaction_id) !== rawTransactionId.trim()
    ) {
      return json(400, { success: false, error: USER_ERRORS.not_successful }, cors);
    }
    const result = await settle(admin, order, payment);
    return userResult(cors, result, order.id);
  }

  const transactionId = rawTransactionId?.trim() ?? "";
  if (!/^[0-9]{4,32}$/.test(transactionId)) {
    return json(400, { error: "orderId is required" }, cors);
  }

  const token = await getMoncashToken();
  const upstream = await moncashPost("/v1/RetrieveTransactionPayment", token, { transactionId });
  if (upstream.kind === "auth") throw new Error("moncash_auth");
  if (upstream.kind === "unavailable") throw new Error("moncash_unavailable");
  const payment = upstream.kind === "ok" ? paymentOf(upstream.body) : null;
  const reference = typeof payment?.reference === "string" ? payment.reference.trim() : "";
  if (!isOrderUuid(reference)) {
    return json(400, { success: false, error: USER_ERRORS.not_successful }, cors);
  }
  const order = await loadOrder(admin, reference);
  if (!order || !assertOrderAccess(order, user, guestToken)) {
    return json(400, { success: false, error: USER_ERRORS.not_successful }, cors);
  }
  if (
    order.status === "completed" &&
    (!order.payment_method || order.payment_method === "moncash") &&
    (!order.moncash_transaction_id || order.moncash_transaction_id === transactionId)
  ) {
    return json(200, { success: true, alreadyCompleted: true, orderId: order.id }, cors);
  }
  const result = await settle(admin, order, payment);
  return userResult(cors, result, order.id);
}
