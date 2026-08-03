import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendOrderConfirmationEmail } from "../_shared/order-confirm-email.ts";

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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    Vary: "Origin",
  };
}

/** Digicel RestAPI_MonCash_doc.pdf — HOST_REST_API + GATEWAY_BASE */
const IS_LIVE = Deno.env.get("MONCASH_ENV") === "live";
const HOST_REST_API = IS_LIVE
  ? "moncashbutton.digicelgroup.com/Api"
  : "sandbox.moncashbutton.digicelgroup.com/Api";
const GATEWAY_BASE = IS_LIVE
  ? "https://moncashbutton.digicelgroup.com/Moncash-middleware"
  : "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";

/** Digicel samples use whole HTG amounts (e.g. 10). */
function toMoncashAmountHtg(total: number): number {
  const amount = Math.round(Number(total));
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error("Invalid MonCash amount (min 1 HTG)");
  }
  return amount;
}

async function getMoncashToken(): Promise<string> {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "MonCash credentials not configured. Add MONCASH_CLIENT_ID and MONCASH_CLIENT_SECRET to your edge function secrets.",
    );
  }

  // Doc: POST https://client_id:client_secret@HOST_REST_API/oauth/token
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`https://${HOST_REST_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=read,write&grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MonCash auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const accessToken = data.access_token as string | undefined;
  if (!accessToken) {
    throw new Error(`MonCash oauth/token missing access_token: ${JSON.stringify(data)}`);
  }
  return accessToken;
}

async function moncashJson(
  path: string,
  token: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://${HOST_REST_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    throw new Error(`MonCash ${path} non-JSON (${res.status}): ${text}`);
  }
  if (!res.ok) {
    throw new Error(`MonCash ${path} failed (${res.status}): ${text}`);
  }
  return data;
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

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const user = await optionalUser(req);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/moncash-payment/, "").replace(/\/$/, "") || "/";

    if ((path === "/create" || path.endsWith("/create")) && req.method === "POST") {
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

      let amount: number;
      try {
        amount = toMoncashAmountHtg(order.total);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid order total" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await getMoncashToken();
      // Doc: POST /v1/CreatePayment — { amount, orderId }
      const data = await moncashJson("/v1/CreatePayment", token, { amount, orderId });
      const paymentTokenObj = data.payment_token as { token?: string } | undefined;
      const paymentToken = paymentTokenObj?.token;
      if (!paymentToken) {
        throw new Error(`MonCash did not return a payment token. Response: ${JSON.stringify(data)}`);
      }

      // Doc: GATEWAY_BASE + /Payment/Redirect?token=<payment-token>
      const paymentUrl = `${GATEWAY_BASE}/Payment/Redirect?token=${encodeURIComponent(paymentToken)}`;

      await admin
        .from("orders")
        .update({ moncash_order_id: orderId, payment_method: "moncash" })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({
          paymentUrl,
          paymentToken,
          amount,
          mode: data.mode ?? (IS_LIVE ? "live" : "sandbox"),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

      const token = await getMoncashToken();
      const transactionId = (body.transactionId as string | undefined)?.trim() || null;

      // Doc: RetrieveOrderPayment by orderId, or RetrieveTransactionPayment by transactionId
      const data = transactionId
        ? await moncashJson("/v1/RetrieveTransactionPayment", token, { transactionId })
        : await moncashJson("/v1/RetrieveOrderPayment", token, { orderId });

      const payment = data.payment as {
        message?: string;
        cost?: number | string;
        transaction_id?: string;
        reference?: string;
        payer?: string;
      } | undefined;
      const successful = payment?.message === "successful";

      if (successful && payment?.cost != null) {
        const paid = Number(payment.cost);
        const expected = Math.round(Number(order.total));
        if (Number.isFinite(paid) && Number.isFinite(expected) && Math.abs(paid - expected) > 0.01) {
          return new Response(
            JSON.stringify({ success: false, error: "Payment amount mismatch" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      if (successful) {
        await admin
          .from("orders")
          .update({
            status: "completed",
            payment_method: "moncash",
            moncash_transaction_id: payment.transaction_id ?? null,
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

      return new Response(JSON.stringify({ success: successful, payment }), {
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
