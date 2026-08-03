import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { sendOrderConfirmationEmail } from "../_shared/order-confirm-email.ts";
import { assertSafeReturnUrl, getAllowedOrigins } from "../_shared/safe-return-url.ts";

const ALLOWED_ORIGINS = getAllowedOrigins();

/** Approx HTG per 1 USD — override with STRIPE_HTG_PER_USD */
const HTG_PER_USD = Number(Deno.env.get("STRIPE_HTG_PER_USD") ?? "132");

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
    Vary: "Origin",
  };
}

function getStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquant. Ajoutez la clé secrète Stripe aux secrets de la fonction edge.",
    );
  }
  return new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

function htgToUsdCents(htg: number): number {
  if (!Number.isFinite(HTG_PER_USD) || HTG_PER_USD <= 0) {
    throw new Error("STRIPE_HTG_PER_USD invalide");
  }
  const cents = Math.max(50, Math.round((htg / HTG_PER_USD) * 100));
  return cents;
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
  return { user };
}

async function optionalUser(req: Request) {
  const auth = await requireUser(req);
  if ("error" in auth) return null;
  return auth.user;
}

function assertOrderAccess(
  order: { user_id: string | null; guest_token?: string | null },
  user: { id: string } | null,
  guestToken?: string | null,
): boolean {
  if (user && order.user_id === user.id) return true;
  if (
    guestToken &&
    order.guest_token &&
    guestToken === order.guest_token &&
    !order.user_id
  ) {
    return true;
  }
  return false;
}

async function markOrderPaid(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  fields: {
    stripe_session_id?: string | null;
    stripe_payment_intent_id?: string | null;
    stripe_amount_usd_cents?: number | null;
  },
) {
  const { data: order } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "completed") return { ok: true, already: true };

  const { error: upErr } = await admin
    .from("orders")
    .update({
      status: "completed",
      payment_method: "stripe",
      ...fields,
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (upErr) return { ok: false, error: upErr.message };

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

  return { ok: true };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/stripe-checkout/, "").replace(/\/$/, "") || "/";

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Webhook (no JWT) ───────────────────────────────────────────────────
    if ((path === "/webhook" || path.endsWith("/webhook")) && req.method === "POST") {
      const stripe = getStripe();
      const sig = req.headers.get("Stripe-Signature");
      const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!sig || !whSecret) {
        return new Response(JSON.stringify({ error: "Webhook not configured" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.text();
      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: `Signature: ${message}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (orderId && session.payment_status === "paid") {
          const pi = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
          await markOrderPaid(admin, orderId, {
            stripe_session_id: session.id,
            stripe_payment_intent_id: pi,
            stripe_amount_usd_cents: session.amount_total ?? null,
          });
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Authenticated or guest-token routes
    const user = await optionalUser(req);
    const stripe = getStripe();

    // ── POST /create ───────────────────────────────────────────────────────
    if ((path === "/create" || path.endsWith("/create")) && req.method === "POST") {
      const body = await req.json();
      const orderId = body.orderId as string | undefined;
      const guestToken = (body.guestToken as string | undefined) ?? null;
      const successUrl = assertSafeReturnUrl(
        (body.successUrl as string | undefined)?.trim(),
        ALLOWED_ORIGINS,
      );
      const cancelUrl = assertSafeReturnUrl(
        (body.cancelUrl as string | undefined)?.trim(),
        ALLOWED_ORIGINS,
      );

      if (!orderId || !successUrl || !cancelUrl) {
        return new Response(
          JSON.stringify({
            error:
              !successUrl || !cancelUrl
                ? "successUrl/cancelUrl invalides ou hors origines autorisées"
                : "orderId, successUrl et cancelUrl sont requis",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id, user_id, total, status, guest_token, guest_email")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Commande introuvable" }), {
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
        return new Response(JSON.stringify({ error: "Commande déjà traitée" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const usdCents = htgToUsdCents(Number(order.total));
      const shortId = orderId.slice(0, 8).toUpperCase();
      const customerEmail = (user as { email?: string } | null)?.email || order.guest_email || undefined;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: customerEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: usdCents,
              product_data: {
                name: `Commande Klirline Store ${shortId}`,
                description: `Total panier ${Number(order.total).toFixed(0)} HTG (carte / Link)`,
              },
            },
          },
        ],
        success_url: successUrl.includes("{CHECKOUT_SESSION_ID}")
          ? successUrl
          : `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          order_id: orderId,
          user_id: user?.id ?? "",
          htg_total: String(order.total),
        },
      });

      await admin
        .from("orders")
        .update({
          payment_method: "stripe",
          stripe_session_id: session.id,
          stripe_amount_usd_cents: usdCents,
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({
          checkoutUrl: session.url,
          sessionId: session.id,
          amountUsdCents: usdCents,
          htgPerUsd: HTG_PER_USD,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── POST /verify ───────────────────────────────────────────────────────
    if ((path === "/verify" || path.endsWith("/verify")) && req.method === "POST") {
      const body = await req.json();
      const orderId = body.orderId as string | undefined;
      const sessionId = body.sessionId as string | undefined;
      const guestToken = (body.guestToken as string | undefined) ?? null;

      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order } = await admin
        .from("orders")
        .select("id, user_id, status, stripe_session_id, guest_token")
        .eq("id", orderId)
        .maybeSingle();

      if (!order || !assertOrderAccess(order, user, guestToken)) {
        return new Response(JSON.stringify({ error: "Commande introuvable" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status === "completed") {
        return new Response(JSON.stringify({ success: true, already: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sid = sessionId || order.stripe_session_id;
      if (!sid) {
        return new Response(JSON.stringify({ success: false, error: "Session Stripe absente" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.retrieve(sid);
      if (session.metadata?.order_id !== orderId) {
        return new Response(JSON.stringify({ success: false, error: "Session / commande mismatch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paid = session.payment_status === "paid" || session.status === "complete";
      if (!paid) {
        return new Response(
          JSON.stringify({ success: false, error: "Paiement Stripe non confirmé" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const pi = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      const result = await markOrderPaid(admin, orderId, {
        stripe_session_id: session.id,
        stripe_payment_intent_id: pi,
        stripe_amount_usd_cents: session.amount_total ?? null,
      });

      if (!result.ok) {
        return new Response(JSON.stringify({ success: false, error: result.error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
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
