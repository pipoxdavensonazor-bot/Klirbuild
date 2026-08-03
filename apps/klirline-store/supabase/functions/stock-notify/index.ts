import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isResendConfigured, sendResendEmail } from "../_shared/resend.ts";

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
  if (error || !user) return { error: "Invalid session", status: 401 as const };
  return { user };
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
    const { productId } = await req.json();
    if (!productId) {
      return new Response(JSON.stringify({ error: "productId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: product } = await admin
      .from("products")
      .select("id, name, in_stock, seller_id, image_url")
      .eq("id", productId)
      .maybeSingle();

    if (!product) {
      return new Response(JSON.stringify({ error: "Produit introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (product.seller_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!product.in_stock) {
      return new Response(JSON.stringify({ sent: 0, skipped: "not in stock" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: alerts } = await admin
      .from("stock_alerts")
      .select("id, email")
      .eq("product_id", productId)
      .is("notified_at", null)
      .limit(200);

    if (!alerts?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailConfigured = isResendConfigured();
    let sent = 0;
    let failed = 0;

    for (const alert of alerts) {
      if (!emailConfigured) {
        failed += 1;
        continue;
      }

      const result = await sendResendEmail({
        to: alert.email,
        subject: `De retour en stock — ${product.name}`,
        html: `<p>Bonne nouvelle ! <strong>${product.name}</strong> est de nouveau disponible sur Klirline Store.</p>
<p><a href="https://klirline.com/produit/${product.id}">Voir le produit</a></p>
<p>— Klirline Store</p>`,
        text: `${product.name} est de nouveau disponible : https://klirline.com/produit/${product.id}`,
      });

      if (result.ok) {
        sent += 1;
        await admin
          .from("stock_alerts")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", alert.id);
      } else {
        failed += 1;
        console.error("stock alert resend failed", alert.id, result.error);
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        pending: alerts.length - sent,
        emailConfigured,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
