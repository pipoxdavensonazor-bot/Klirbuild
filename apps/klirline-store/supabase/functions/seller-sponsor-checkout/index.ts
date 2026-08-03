import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";
import { assertSafeReturnUrl, getAllowedOrigins } from "../_shared/safe-return-url.ts";

const ALLOWED_ORIGINS = getAllowedOrigins();

const HTG_PER_USD = Number(Deno.env.get("STRIPE_HTG_PER_USD") ?? "132");
/** Monthly Sponsored plan price in HTG */
const SPONSOR_PRICE_HTG = Number(Deno.env.get("SPONSOR_PRICE_HTG") ?? "5000");
const SPONSOR_DAYS = Number(Deno.env.get("SPONSOR_DURATION_DAYS") ?? "30");

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
    Vary: "Origin",
  };
}

function getStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquant.");
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
  return Math.max(50, Math.round((htg / HTG_PER_USD) * 100));
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

async function activateFromSession(
  admin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
) {
  const sponsorshipId = session.metadata?.sponsorship_id;
  if (!sponsorshipId) return { ok: false, error: "Missing sponsorship_id" };

  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await admin
    .from("seller_sponsorships")
    .update({
      stripe_session_id: session.id,
      stripe_payment_intent_id: pi,
      stripe_amount_usd_cents: session.amount_total ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorshipId);

  const { error } = await admin.rpc("activate_seller_sponsorship", {
    p_sponsorship_id: sponsorshipId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, sponsorshipId };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path =
      url.pathname.replace(/^\/seller-sponsor-checkout/, "").replace(/\/$/, "") ||
      "/";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Webhook
    if ((path === "/webhook" || path.endsWith("/webhook")) && req.method === "POST") {
      const stripe = getStripe();
      const sig = req.headers.get("stripe-signature");
      const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!sig || !whSecret) {
        return new Response(JSON.stringify({ error: "Webhook misconfigured" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = await req.text();
      let event: Stripe.Event;
      try {
        event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Signature: ${msg}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "seller_sponsor") {
          await activateFromSession(admin, session);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const auth = await requireUser(req);
    if ("error" in auth && auth.error) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { user } = auth as { user: { id: string; email?: string } };
    const stripe = getStripe();

    // POST /create
    if ((path === "/create" || path.endsWith("/create")) && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const defaultSuccess = "https://klirline.com/?checkout=sponsor_success";
      const defaultCancel = "https://klirline.com/?checkout=sponsor_cancel";
      const successUrl =
        assertSafeReturnUrl((body.successUrl as string) || defaultSuccess, ALLOWED_ORIGINS) ??
        defaultSuccess;
      const cancelUrl =
        assertSafeReturnUrl((body.cancelUrl as string) || defaultCancel, ALLOWED_ORIGINS) ??
        defaultCancel;

      const { data: vendor } = await admin
        .from("vendor_applications")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      if (!vendor) {
        return new Response(
          JSON.stringify({
            error: "Seuls les vendeurs KYC approuvés peuvent s’abonner Sponsored.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const amountHtg = Number.isFinite(SPONSOR_PRICE_HTG) && SPONSOR_PRICE_HTG > 0
        ? SPONSOR_PRICE_HTG
        : 5000;
      const usdCents = htgToUsdCents(amountHtg);
      const days = Number.isFinite(SPONSOR_DAYS) && SPONSOR_DAYS > 0 ? SPONSOR_DAYS : 30;

      const { data: sponsorship, error: insErr } = await admin
        .from("seller_sponsorships")
        .insert({
          seller_id: user.id,
          status: "pending",
          plan: "monthly_sponsor",
          amount_htg: amountHtg,
          duration_days: days,
          priority_support: true,
          admin_followup_status: "pending",
        })
        .select("id")
        .maybeSingle();

      if (insErr || !sponsorship) {
        throw new Error(insErr?.message || "Impossible de créer l’abonnement");
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: usdCents,
              product_data: {
                name: "Klirline Sponsored — 30 jours",
                description:
                  "Produits en tête du fil d’actualité + suivi prioritaire Klirline",
              },
            },
          },
        ],
        success_url: successUrl.includes("{CHECKOUT_SESSION_ID}")
          ? successUrl
          : `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}&sponsorship_id=${sponsorship.id}`,
        cancel_url: cancelUrl,
        metadata: {
          type: "seller_sponsor",
          sponsorship_id: sponsorship.id,
          seller_id: user.id,
        },
      });

      await admin
        .from("seller_sponsorships")
        .update({
          stripe_session_id: session.id,
          stripe_amount_usd_cents: usdCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sponsorship.id);

      return new Response(
        JSON.stringify({
          checkoutUrl: session.url,
          sponsorshipId: sponsorship.id,
          amountHtg,
          usdCents,
          days,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // POST /verify
    if ((path === "/verify" || path.endsWith("/verify")) && req.method === "POST") {
      const body = await req.json();
      const sessionId = body.sessionId as string | undefined;
      const sponsorshipId = body.sponsorshipId as string | undefined;

      let sid = sessionId;
      if (!sid && sponsorshipId) {
        const { data: row } = await admin
          .from("seller_sponsorships")
          .select("stripe_session_id, seller_id, status")
          .eq("id", sponsorshipId)
          .maybeSingle();
        if (!row || row.seller_id !== user.id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (row.status === "active") {
          return new Response(JSON.stringify({ success: true, alreadyActive: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        sid = row.stripe_session_id ?? undefined;
      }

      if (!sid) {
        return new Response(JSON.stringify({ error: "sessionId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.retrieve(sid);
      if (session.metadata?.seller_id && session.metadata.seller_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.payment_status !== "paid" && session.status !== "complete") {
        return new Response(
          JSON.stringify({ success: false, error: "Paiement non confirmé" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await activateFromSession(admin, session);
      if (!result.ok) {
        return new Response(JSON.stringify({ success: false, error: result.error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, sponsorshipId: result.sponsorshipId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET-ish via POST /pricing
    if ((path === "/pricing" || path.endsWith("/pricing")) && req.method === "POST") {
      return new Response(
        JSON.stringify({
          amountHtg: SPONSOR_PRICE_HTG,
          days: SPONSOR_DAYS,
          usdEstimate: (SPONSOR_PRICE_HTG / HTG_PER_USD).toFixed(2),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
