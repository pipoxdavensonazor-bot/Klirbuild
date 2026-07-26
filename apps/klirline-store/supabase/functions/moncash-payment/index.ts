import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://klirline-store.pages.dev,https://store.klirline.com,https://klirline.com,http://localhost:5173,http://localhost:4173")
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

const IS_LIVE = Deno.env.get("MONCASH_ENV") === "live";
const HOST_REST_API = IS_LIVE
  ? "moncashbutton.digicelgroup.com/Api"
  : "sandbox.moncashbutton.digicelgroup.com/Api";
const GATEWAY_BASE = IS_LIVE
  ? "https://moncashbutton.digicelgroup.com/Moncash-middleware"
  : "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";

async function getMoncashToken(): Promise<string> {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error(
      "MonCash credentials not configured. Add MONCASH_CLIENT_ID and MONCASH_CLIENT_SECRET to your edge function secrets.",
    );
  }

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
  return data.access_token as string;
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

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const auth = await requireUser(req);
    if ("error" in auth && auth.error) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user } = auth as { user: { id: string } };

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/moncash-payment/, "").replace(/\/$/, "") || "/";

    // POST /create — Body: { orderId: string }  (amount taken from DB)
    if ((path === "/create" || path.endsWith("/create")) && req.method === "POST") {
      const body = await req.json();
      const orderId = body.orderId as string | undefined;

      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, user_id, total, status")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.user_id !== user.id) {
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

      const token = await getMoncashToken();
      const res = await fetch(`https://${HOST_REST_API}/v1/CreatePayment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ amount, orderId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`MonCash CreatePayment failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      const paymentToken = data.payment_token?.token;
      if (!paymentToken) {
        throw new Error(`MonCash did not return a payment token. Response: ${JSON.stringify(data)}`);
      }

      const paymentUrl = `${GATEWAY_BASE}/Payment/Redirect?token=${paymentToken}`;

      await admin
        .from("orders")
        .update({ moncash_order_id: orderId })
        .eq("id", orderId)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ paymentUrl, paymentToken }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /verify — Body: { orderId: string }
    if ((path === "/verify" || path.endsWith("/verify")) && req.method === "POST") {
      const { orderId } = await req.json();

      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, user_id, total, status")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.user_id !== user.id) {
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
      const res = await fetch(`https://${HOST_REST_API}/v1/RetrieveOrderPayment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`MonCash RetrieveOrderPayment failed (${res.status}): ${text}`);
      }

      const data = await res.json();
      const payment = data.payment;
      const successful = payment?.message === "successful";

      // Optional amount check when MonCash returns cost
      if (successful && payment?.cost != null) {
        const paid = Number(payment.cost);
        const expected = Number(order.total);
        if (Number.isFinite(paid) && Math.abs(paid - expected) > 0.01) {
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
            moncash_transaction_id: payment.transaction_id ?? null,
          })
          .eq("id", orderId)
          .eq("user_id", user.id);

        // Escrow: create per-seller fulfillment rows (commission held)
        const { error: fulfillErr } = await admin.rpc("create_order_fulfillments", {
          p_order_id: orderId,
        });
        if (fulfillErr) {
          console.error("create_order_fulfillments failed", fulfillErr);
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
