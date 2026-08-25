import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforceCheckoutCreateLimit, tooManyRequests } from "../_shared/rate-limit.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://klirline-store.pages.dev,https://store.klirline.com,https://klirline.com,https://www.klirline.com,http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Keep in sync with apps/klirline-store/src/lib/commerce.ts */
const SHIPPING_FEES_HTG: Record<string, number> = {
  Ouest: 250,
  Nord: 400,
  "Nord-Est": 450,
  "Nord-Ouest": 450,
  Artibonite: 350,
  Centre: 350,
  Sud: 400,
  "Sud-Est": 400,
  "Grand'Anse": 500,
  Nippes: 450,
};
const DEFAULT_SHIPPING_FEE_HTG = 350;

const MAX_LINE_ITEMS = 50;
const MAX_QTY_PER_PRODUCT = 20;

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

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;
}

function getShippingFee(department: string): number {
  return SHIPPING_FEES_HTG[department] ?? DEFAULT_SHIPPING_FEE_HTG;
}

function displayPrice(row: { price: number; deal_price: number | null }): number {
  if (row.deal_price != null && Number.isFinite(Number(row.deal_price))) {
    return Number(row.deal_price);
  }
  return Number(row.price);
}

function json(corsHeaders: Record<string, string>, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  const { data: { user } } = await userClient.auth.getUser();
  return user ?? null;
}

type ItemIn = { product_id?: string; quantity?: number; price?: number };

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(corsHeaders, 405, { error: "Method not allowed" });
  }

  try {
    const body = await req.json();
    const rawItems = body.items as ItemIn[] | undefined;
    const payment_method = body.payment_method as string | undefined;
    const ship = {
      shipping_full_name: String(body.shipping_full_name ?? "").trim().slice(0, 200),
      shipping_phone: String(body.shipping_phone ?? "").trim().slice(0, 40),
      shipping_street: String(body.shipping_street ?? "").trim().slice(0, 300),
      shipping_city: String(body.shipping_city ?? "").trim().slice(0, 120),
      shipping_department: String(body.shipping_department ?? "").trim().slice(0, 80),
    };
    const guest_email = String(body.guest_email ?? "").trim().toLowerCase();

    // Optional client totals — accepted only when they match server recalculation (compat).
    const clientTotal = body.total != null ? Number(body.total) : null;
    const clientShipping = body.shipping_fee != null ? Number(body.shipping_fee) : null;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return json(corsHeaders, 400, { error: "Panier vide" });
    }
    if (rawItems.length > MAX_LINE_ITEMS) {
      return json(corsHeaders, 400, { error: `Maximum ${MAX_LINE_ITEMS} articles` });
    }
    if (!["moncash", "natcash", "stripe"].includes(payment_method ?? "")) {
      return json(corsHeaders, 400, { error: "Moyen de paiement invalide" });
    }
    if (
      !ship.shipping_full_name || !ship.shipping_phone || !ship.shipping_street ||
      !ship.shipping_city || !ship.shipping_department
    ) {
      return json(corsHeaders, 400, { error: "Adresse de livraison incomplète" });
    }
    if (!(ship.shipping_department in SHIPPING_FEES_HTG)) {
      return json(corsHeaders, 400, { error: "Département de livraison invalide" });
    }

    const user = await optionalUser(req);
    if (!user && !isEmail(guest_email)) {
      return json(corsHeaders, 400, { error: "Email obligatoire pour payer sans compte" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const identity = user?.id ?? guest_email;
    const allowed = await enforceCheckoutCreateLimit(admin, req, identity);
    if (!allowed) {
      return tooManyRequests(corsHeaders, 600);
    }

    const qtyById = new Map<string, number>();
    for (const it of rawItems) {
      const id = String(it.product_id ?? "").trim();
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return json(corsHeaders, 400, { error: "product_id invalide" });
      }
      const qty = Math.floor(Number(it.quantity) || 0);
      if (qty < 1) {
        return json(corsHeaders, 400, { error: "Quantité invalide" });
      }
      const next = (qtyById.get(id) ?? 0) + qty;
      if (next > MAX_QTY_PER_PRODUCT) {
        return json(corsHeaders, 400, {
          error: `Quantité max ${MAX_QTY_PER_PRODUCT} par produit`,
        });
      }
      qtyById.set(id, next);
    }

    const productIds = [...qtyById.keys()];

    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, price, deal_price, in_stock, name")
      .in("id", productIds);

    if (productsError) {
      return json(corsHeaders, 500, { error: productsError.message });
    }
    if (!products || products.length !== productIds.length) {
      return json(corsHeaders, 400, { error: "Produit introuvable ou retiré du catalogue" });
    }

    const byId = new Map(products.map((p) => [p.id as string, p]));
    let subtotal = 0;
    const rows: { product_id: string; quantity: number; price: number }[] = [];

    for (const [productId, quantity] of qtyById) {
      const product = byId.get(productId);
      if (!product) {
        return json(corsHeaders, 400, { error: "Produit introuvable" });
      }
      if (product.in_stock === false) {
        return json(corsHeaders, 400, {
          error: `Rupture de stock : ${product.name ?? productId}`,
        });
      }
      const unit = displayPrice({
        price: Number(product.price),
        deal_price: product.deal_price == null ? null : Number(product.deal_price),
      });
      if (!Number.isFinite(unit) || unit < 0) {
        return json(corsHeaders, 400, { error: "Prix catalogue invalide" });
      }
      subtotal += unit * quantity;
      rows.push({ product_id: productId, quantity, price: unit });
    }

    const shipping_fee = getShippingFee(ship.shipping_department);
    const total = Math.round((subtotal + shipping_fee) * 100) / 100;

    if (!Number.isFinite(total) || total <= 0) {
      return json(corsHeaders, 400, { error: "Total invalide" });
    }

    // Reject obvious client tampering when optional fields are still sent.
    if (clientShipping != null && Number.isFinite(clientShipping) && clientShipping !== shipping_fee) {
      return json(corsHeaders, 400, { error: "Frais de livraison invalides" });
    }
    if (clientTotal != null && Number.isFinite(clientTotal) && Math.abs(clientTotal - total) > 0.01) {
      return json(corsHeaders, 400, { error: "Total invalide" });
    }
    for (const it of rawItems) {
      if (it.price == null) continue;
      const clientPrice = Number(it.price);
      const product = byId.get(String(it.product_id));
      if (!product || !Number.isFinite(clientPrice)) continue;
      const unit = displayPrice({
        price: Number(product.price),
        deal_price: product.deal_price == null ? null : Number(product.deal_price),
      });
      if (Math.abs(clientPrice - unit) > 0.01) {
        return json(corsHeaders, 400, { error: "Prix invalide" });
      }
    }

    const guest_token = user
      ? null
      : crypto.randomUUID() + crypto.randomUUID(); // ~256 bits of entropy

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        guest_email: user ? null : guest_email,
        guest_token,
        total,
        status: "pending",
        payment_method,
        shipping_fee,
        ...ship,
      })
      .select("id")
      .maybeSingle();

    if (orderError || !order) {
      return json(corsHeaders, 500, {
        error: orderError?.message || "Création commande échouée",
      });
    }

    const { error: itemsError } = await admin.from("order_items").insert(
      rows.map((r) => ({ ...r, order_id: order.id })),
    );
    if (itemsError) {
      await admin.from("orders").delete().eq("id", order.id);
      return json(corsHeaders, 500, { error: itemsError.message });
    }

    return json(corsHeaders, 200, {
      orderId: order.id,
      guestToken: guest_token,
      total,
      shipping_fee,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(corsHeaders, 500, { error: message });
  }
});
