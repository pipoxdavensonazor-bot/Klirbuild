import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendOrderConfirmationEmail } from "../_shared/order-confirm-email.ts";
import { enforcePaymentCreateLimit, tooManyRequests } from "../_shared/rate-limit.ts";

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

/** Sandbox when NATCASH_DEBUG=true (matches php-natcash-sdk). */
const IS_SANDBOX = Deno.env.get("NATCASH_DEBUG") === "true";
const API_BASE = IS_SANDBOX
  ? "https://testmerchantpay.natcom.com.ht/api/online-payment/"
  : "https://merchantpay.natcom.com.ht/api/online-payment/";

const STORE_RETURN =
  Deno.env.get("NATCASH_RETURN_URL") ?? "https://klirline.com";

type NatcashConfig = {
  privateKey: string;
  partnerCode: string;
  functionCode: string;
  username: string;
  password: string;
  callbackUrl: string;
  enableFee: boolean;
  language: string;
};

function getConfig(): NatcashConfig {
  const privateKey = Deno.env.get("NATCASH_PRIVATE_KEY") ?? "";
  const partnerCode = Deno.env.get("NATCASH_PARTNER_CODE") ?? "";
  const functionCode = Deno.env.get("NATCASH_FUNCTION_CODE") ?? "";
  const username = Deno.env.get("NATCASH_USERNAME") ?? "";
  const password = Deno.env.get("NATCASH_PASSWORD") ?? "";
  const callbackUrl = Deno.env.get("NATCASH_CALLBACK_URL") ??
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/natcash-payment/callback`;
  const enableFee = Deno.env.get("NATCASH_ENABLE_FEE") !== "false";
  const language = Deno.env.get("NATCASH_LANGUAGE") ?? "ht";

  if (!privateKey || !partnerCode || !functionCode || !username || !password) {
    throw new Error(
      "NatCash credentials not configured. Add NATCASH_PRIVATE_KEY, NATCASH_PARTNER_CODE, NATCASH_FUNCTION_CODE, NATCASH_USERNAME, NATCASH_PASSWORD to edge secrets.",
    );
  }

  return {
    privateKey,
    partnerCode,
    functionCode,
    username,
    password,
    callbackUrl,
    enableFee,
    language,
  };
}

function bytesToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(message),
  );
  return bytesToHex(digest);
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return bytesToHex(sig);
}

function uuidV4(): string {
  return crypto.randomUUID();
}

/** PHP-style string cast for signature concat (amount/timestamp). */
function phpStr(v: string | number | boolean): string {
  if (typeof v === "boolean") return v ? "1" : "";
  return String(v);
}

async function paymentSignature(
  cfg: NatcashConfig,
  opts: { requestId: string; timestamp: number; orderNumber: string; amount: number },
): Promise<string> {
  const accessKey = await sha256Hex(cfg.privateKey + opts.requestId);
  const message = [
    accessKey,
    cfg.partnerCode,
    cfg.username,
    cfg.password,
    phpStr(opts.timestamp),
    opts.requestId,
    opts.orderNumber,
    phpStr(opts.amount),
  ].join("");
  return hmacSha256Hex(cfg.privateKey, message);
}

async function transactionSignature(
  cfg: NatcashConfig,
  orderNumber: string,
  requestId: string,
): Promise<string> {
  const accessKey = await sha256Hex(cfg.privateKey + requestId);
  const message = [
    accessKey,
    cfg.partnerCode,
    cfg.username,
    cfg.password,
    orderNumber,
    requestId,
  ].join("");
  return hmacSha256Hex(cfg.privateKey, message);
}

async function payloadValidationSignature(
  cfg: NatcashConfig,
  orderNumber: string,
  code: number,
): Promise<string> {
  const accessKey = await sha256Hex(cfg.functionCode + orderNumber);
  const message = [accessKey, orderNumber, phpStr(code)].join("");
  return hmacSha256Hex(cfg.functionCode, message);
}

async function verifyPayloadSignature(
  cfg: NatcashConfig,
  orderNumber: string,
  code: number,
  signature: string,
): Promise<boolean> {
  const expected = await payloadValidationSignature(cfg, orderNumber, code);
  if (expected.length !== signature.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return ok === 0;
}

type TxDetails = {
  orderNumber: string;
  transId: string;
  amount: number;
  toPhone: string;
  responseCode: number;
  successful: boolean;
};

async function checkTransaction(cfg: NatcashConfig, orderNumber: string): Promise<TxDetails> {
  const requestId = uuidV4();
  const signature = await transactionSignature(cfg, orderNumber, requestId);
  const res = await fetch(`${API_BASE}merchant/checkTransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      requestId,
      username: cfg.username,
      password: cfg.password,
      partnerCode: cfg.partnerCode,
      orderNumber,
      signature,
    }),
  });

  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`NatCash checkTransaction invalid JSON (${res.status}): ${text}`);
  }

  if (body.status !== 0) {
    throw new Error(
      `NatCash checkTransaction failed: ${String(body.message ?? text)}`,
    );
  }

  const data = (body.data ?? body) as Record<string, unknown>;
  const nested = (data.data ?? data) as Record<string, unknown>;
  const responseCode = Number(nested.responseCode ?? nested.response_code ?? -3);
  return {
    orderNumber: String(nested.orderNumber ?? orderNumber),
    transId: String(nested.transId ?? nested.transactionId ?? ""),
    amount: Number(nested.amount ?? 0),
    toPhone: String(nested.toPhone ?? ""),
    responseCode,
    successful: responseCode === 1,
  };
}

async function createPayment(
  cfg: NatcashConfig,
  orderNumber: string,
  amount: number,
): Promise<{ url: string; expiredAt: number }> {
  const requestId = uuidV4();
  const timestamp = Date.now();
  const signature = await paymentSignature(cfg, {
    requestId,
    timestamp,
    orderNumber,
    amount,
  });

  const payload = {
    partnerCode: cfg.partnerCode,
    username: cfg.username,
    password: cfg.password,
    callbackUrl: cfg.callbackUrl,
    enableFee: cfg.enableFee,
    language: cfg.language,
    orderNumber,
    amount,
    timestamp,
    requestId,
    skipPhoneInput: false,
    signature,
  };

  const res = await fetch(`${API_BASE}credential`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`NatCash credential invalid JSON (${res.status}): ${text}`);
  }

  if (body.status !== 0) {
    throw new Error(`NatCash CreatePayment failed: ${String(body.message ?? text)}`);
  }

  const url = String(body.url ?? (body.data as Record<string, unknown> | undefined)?.url ?? "");
  const expiredAt = Number(
    body.expiredAt ?? (body.data as Record<string, unknown> | undefined)?.expiredAt ?? 0,
  );
  if (!url) {
    throw new Error(`NatCash did not return a payment URL. Response: ${text}`);
  }
  return { url, expiredAt };
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt || jwt === Deno.env.get("SUPABASE_ANON_KEY")) {
    return { error: "Authentication required", status: 401 as const };
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return { error: "Invalid or expired session", status: 401 as const };
  }
  return { user, jwt };
}

async function optionalUser(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) return null;
  return auth.user as { id: string };
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

async function markOrderPaid(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  transId: string | null,
) {
  const { data: existing } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!existing) return;
  if (existing.status === "completed") return;

  await admin
    .from("orders")
    .update({
      status: "completed",
      payment_method: "natcash",
      natcash_transaction_id: transId,
    })
    .eq("id", orderId)
    .eq("status", "pending");

  const { error: fulfillErr } = await admin.rpc("create_order_fulfillments", {
    p_order_id: orderId,
  });
  if (fulfillErr) {
    console.error("create_order_fulfillments failed", fulfillErr);
  }

  try {
    const mail = await sendOrderConfirmationEmail(admin, orderId);
    if (!mail.sent) console.log("order confirm email skipped", mail.reason);
  } catch (e) {
    console.error("order confirm email failed", e);
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/natcash-payment/, "").replace(/\/$/, "") || "/";

    if ((path === "/callback" || path.endsWith("/callback")) && req.method === "GET") {
      const orderNumber = url.searchParams.get("orderNumber") ?? "";
      const code = Number(url.searchParams.get("code") ?? "-3");
      const signature = url.searchParams.get("signature") ?? "";

      const redirectOk = `${STORE_RETURN}/?checkout=natcash_success&order_id=${encodeURIComponent(orderNumber)}`;
      const redirectFail = `${STORE_RETURN}/?checkout=natcash_cancel&order_id=${encodeURIComponent(orderNumber)}`;

      if (!orderNumber || !signature) {
        return Response.redirect(redirectFail, 302);
      }

      const cfg = getConfig();
      const valid = await verifyPayloadSignature(cfg, orderNumber, code, signature);
      if (!valid) {
        console.error("NatCash callback invalid signature", orderNumber);
        return Response.redirect(redirectFail, 302);
      }

      if (code === 1) {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: order } = await admin
          .from("orders")
          .select("id, status, total")
          .eq("id", orderNumber)
          .maybeSingle();

        if (order && order.status !== "completed") {
          try {
            const tx = await checkTransaction(cfg, orderNumber);
            if (tx.successful) {
              const expected = Number(order.total);
              if (Number.isFinite(tx.amount) && Math.abs(tx.amount - expected) > 0.01) {
                console.error("NatCash amount mismatch", tx.amount, expected);
              } else {
                await markOrderPaid(admin, order.id, tx.transId || null);
              }
            }
          } catch (e) {
            console.error("NatCash callback checkTransaction", e);
          }
        }
        return Response.redirect(redirectOk, 302);
      }

      return Response.redirect(redirectFail, 302);
    }

    const user = await optionalUser(req);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if ((path === "/create" || path.endsWith("/create")) && req.method === "POST") {
      const payOk = await enforcePaymentCreateLimit(admin, req);
      if (!payOk) return tooManyRequests(corsHeaders, 600);

      const body = await req.json();
      const orderId = body.orderId as string | undefined;
      const guestToken = (body.guestToken as string | undefined) ?? null;

      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, user_id, total, status, guest_token")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!assertOrderAccess(order, user, guestToken)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status !== "pending") {
        return new Response(JSON.stringify({ error: "Order is not pending" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amount = Number(order.total);
      if (!Number.isFinite(amount) || amount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid order total" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cfg = getConfig();
      const { url: paymentUrl, expiredAt } = await createPayment(cfg, orderId, amount);

      await admin
        .from("orders")
        .update({
          natcash_order_id: orderId,
          payment_method: "natcash",
        })
        .eq("id", orderId);

      return new Response(JSON.stringify({ paymentUrl, expiredAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((path === "/verify" || path.endsWith("/verify")) && req.method === "POST") {
      const body = await req.json();
      const orderId = body.orderId as string | undefined;
      const guestToken = (body.guestToken as string | undefined) ?? null;

      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, user_id, total, status, guest_token")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!assertOrderAccess(order, user, guestToken)) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status === "completed") {
        return new Response(JSON.stringify({ success: true, alreadyCompleted: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cfg = getConfig();
      const tx = await checkTransaction(cfg, orderId);

      if (tx.successful) {
        const paid = Number(tx.amount);
        const expected = Number(order.total);
        if (Number.isFinite(paid) && Math.abs(paid - expected) > 0.01) {
          return new Response(
            JSON.stringify({ success: false, error: "Payment amount mismatch" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        await markOrderPaid(admin, orderId, tx.transId || null);
      }

      return new Response(JSON.stringify({ success: tx.successful, payment: tx }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
    });
  }
});
