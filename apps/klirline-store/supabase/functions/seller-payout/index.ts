import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const IS_LIVE = Deno.env.get("MONCASH_ENV") === "live";
const HOST_REST_API = IS_LIVE
  ? "moncashbutton.digicelgroup.com/Api"
  : "sandbox.moncashbutton.digicelgroup.com/Api";

async function getMoncashToken(): Promise<string> {
  const clientId = Deno.env.get("MONCASH_CLIENT_ID");
  const clientSecret = Deno.env.get("MONCASH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(
      "MonCash credentials not configured. Add MONCASH_CLIENT_ID and MONCASH_CLIENT_SECRET to edge secrets.",
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

function normalizeWallet(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (/^509\d{8}$/.test(digits)) return digits;
  if (/^\d{8}$/.test(digits)) return `509${digits}`;
  throw new Error("Numéro MonCash invalide (attendu 509XXXXXXXX).");
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

function isPayoutEligible(f: {
  status: string;
  shipped_at: string | null;
}): boolean {
  if (f.status === "payout_ready" || f.status === "delivered") return true;
  if (f.status === "shipped" && f.shipped_at) {
    const shipped = new Date(f.shipped_at).getTime();
    return shipped <= Date.now() - 7 * 24 * 60 * 60 * 1000;
  }
  return false;
}

async function moncashTransfer(opts: {
  amount: number;
  receiver: string;
  desc: string;
  reference: string;
}): Promise<{ transactionId: string; raw: unknown }> {
  const token = await getMoncashToken();
  const res = await fetch(`https://${HOST_REST_API}/v1/Transfert`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      amount: opts.amount,
      receiver: opts.receiver,
      desc: opts.desc,
      reference: opts.reference,
    }),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`MonCash Transfer invalid JSON (${res.status}): ${text}`);
  }
  const transfer = data.transfer as Record<string, unknown> | undefined;
  const message = String(transfer?.message ?? data.message ?? "");
  const ok =
    res.ok &&
    (message.toLowerCase() === "successful" ||
      Number(data.status) === 200);
  if (!ok) {
    throw new Error(
      `MonCash Transfer failed (${res.status}): ${message || text}`,
    );
  }
  return {
    transactionId: String(transfer?.transaction_id ?? ""),
    raw: data,
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = await req.json();
    const fulfillmentId = body.fulfillmentId as string | undefined;
    if (!fulfillmentId) {
      return new Response(JSON.stringify({ error: "fulfillmentId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fulfillment, error: fErr } = await admin
      .from("order_fulfillments")
      .select(
        "id, order_id, seller_id, status, net_amount, shipped_at, paid_out_at, payout_transaction_id, payout_reference, payout_error",
      )
      .eq("id", fulfillmentId)
      .maybeSingle();

    if (fErr || !fulfillment) {
      return new Response(JSON.stringify({ error: "Fulfillment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    const isAdmin = Boolean(profile?.is_admin);
    if (fulfillment.seller_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (fulfillment.status === "paid_out") {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyPaid: true,
          transactionId: fulfillment.payout_transaction_id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (fulfillment.status === "disputed") {
      return new Response(JSON.stringify({ error: "Fulfillment is disputed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isPayoutEligible(fulfillment)) {
      return new Response(
        JSON.stringify({
          error: "Versement pas encore éligible (livraison confirmée ou J+7).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: vendor } = await admin
      .from("vendor_applications")
      .select("payout_method, payout_wallet, business_phone")
      .eq("user_id", fulfillment.seller_id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const method = vendor?.payout_method ?? "moncash";
    if (method !== "moncash") {
      return new Response(
        JSON.stringify({
          error:
            "Versement NatCash automatique pas encore activé. Choisissez MonCash comme portefeuille vendeur, ou demandez un versement manuel (admin).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const walletRaw = vendor?.payout_wallet || vendor?.business_phone || "";
    if (!walletRaw) {
      return new Response(
        JSON.stringify({
          error:
            "Configurez votre numéro MonCash (portefeuille vendeur) dans le tableau de bord avant de demander le versement.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let receiver: string;
    try {
      receiver = normalizeWallet(walletRaw);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const net = Number(fulfillment.net_amount);
    if (!Number.isFinite(net) || net <= 0) {
      return new Response(JSON.stringify({ error: "Invalid net amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amount = Math.round(net);
    if (amount < 1) {
      return new Response(JSON.stringify({ error: "Amount too small" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference =
      fulfillment.payout_reference ||
      `klir-payout-${fulfillment.id.replace(/-/g, "").slice(0, 24)}`;

    const preUpdate: Record<string, unknown> = {
      payout_provider: "moncash",
      payout_reference: reference,
      payout_attempted_at: new Date().toISOString(),
      payout_error: null,
      status: "payout_ready",
      updated_at: new Date().toISOString(),
    };
    if (fulfillment.status !== "payout_ready") {
      preUpdate.payout_ready_at = new Date().toISOString();
    }
    await admin.from("order_fulfillments").update(preUpdate).eq("id", fulfillment.id);

    try {
      const result = await moncashTransfer({
        amount,
        receiver,
        desc: `Klirline versement commande ${String(fulfillment.order_id).slice(0, 8)}`,
        reference,
      });

      await admin
        .from("order_fulfillments")
        .update({
          status: "paid_out",
          paid_out_at: new Date().toISOString(),
          payout_provider: "moncash",
          payout_reference: reference,
          payout_transaction_id: result.transactionId || null,
          payout_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fulfillment.id);

      return new Response(
        JSON.stringify({
          success: true,
          amount,
          receiver,
          transactionId: result.transactionId,
          reference,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (transferErr: unknown) {
      const message =
        transferErr instanceof Error ? transferErr.message : String(transferErr);
      await admin
        .from("order_fulfillments")
        .update({
          payout_error: message.slice(0, 500),
          payout_attempted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", fulfillment.id);

      return new Response(JSON.stringify({ success: false, error: message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
    });
  }
});
