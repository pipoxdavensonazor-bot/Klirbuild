import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return "unknown";
}

export async function claimRateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("claim_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("claim_rate_limit", error.message);
    // Fail open only if the migration is not applied yet.
    if (/claim_rate_limit|does not exist|schema cache/i.test(error.message)) {
      return true;
    }
    return false;
  }
  return data === true;
}

export function tooManyRequests(
  corsHeaders: Record<string, string>,
  retryAfterSeconds: number,
  message = "Trop de tentatives. Réessayez dans quelques minutes.",
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
    },
  });
}

/** Checkout create: 8 / 10 min per IP, 5 / 10 min per account or guest email. */
export async function enforceCheckoutCreateLimit(
  admin: SupabaseClient,
  req: Request,
  identity: string,
): Promise<boolean> {
  const ip = clientIp(req);
  const windowSec = 600;
  const ipOk = await claimRateLimit(admin, `checkout:ip:${ip}`, 8, windowSec);
  const idOk = await claimRateLimit(admin, `checkout:id:${identity}`, 5, windowSec);
  return ipOk && idOk;
}

/** Payment create (MonCash / NatCash / Stripe): 8 / 10 min per IP. */
export async function enforcePaymentCreateLimit(
  admin: SupabaseClient,
  req: Request,
): Promise<boolean> {
  return claimRateLimit(admin, `pay:ip:${clientIp(req)}`, 8, 600);
}
