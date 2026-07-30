import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { isStripeConfigured, priceIdForPlan } from "@/lib/stripe";

/**
 * Statut Stripe — authentifié + billing:manage (plus de fuite anonyme).
 */
export async function GET() {
  const auth = await requirePermission("billing:manage");
  if (auth instanceof NextResponse) return auth;

  const plans = ["starter", "growth", "business"] as const;
  const cycles = ["monthly", "yearly"] as const;
  const prices: Record<string, boolean> = {};
  for (const p of plans) {
    for (const c of cycles) {
      prices[`${p}_${c}`] = Boolean(priceIdForPlan(p, c));
    }
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  const configured = isStripeConfigured();
  const pricesReady = Object.values(prices).filter(Boolean).length;

  return NextResponse.json({
    configured,
    connected: configured,
    connectionError: configured
      ? null
      : "Stripe non configuré pour cet environnement.",
    publishableKeySet: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    webhookSecretSet: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    prices,
    pricesReady,
    pricesTotal: Object.keys(prices).length,
    modeHint: key.startsWith("sk_live")
      ? "live"
      : key.startsWith("rk_live")
        ? "live_restricted"
        : key.includes("test")
          ? "test"
          : key
            ? "unknown"
            : "none",
  });
}
