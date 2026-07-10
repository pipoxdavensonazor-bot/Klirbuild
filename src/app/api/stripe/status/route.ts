import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured, priceIdForPlan } from "@/lib/stripe";

export async function GET() {
  const plans = ["starter", "growth", "business"] as const;
  const cycles = ["monthly", "yearly"] as const;
  const prices: Record<string, boolean> = {};
  for (const p of plans) {
    for (const c of cycles) {
      prices[`${p}_${c}`] = Boolean(priceIdForPlan(p, c));
    }
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  let connected = false;
  let connectionError: string | null = null;

  if (isStripeConfigured()) {
    try {
      const stripe = getStripe();
      await stripe.balance.retrieve();
      connected = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connexion Stripe échouée";
      if (msg.includes("LIVE détectée")) {
        connectionError =
          "Clé LIVE bloquée en local. Utilisez sk_test_… ou rk_test_… (mode Test dans Stripe).";
      } else if (msg.includes("Invalid API Key") || msg.includes("api_key")) {
        connectionError =
          "Clé Stripe invalide ou révoquée. Créez une nouvelle clé TEST dans le Dashboard.";
      } else if (msg.includes("permissions") || msg.includes("permission")) {
        connectionError =
          "Clé restreinte (rk_…) sans permissions. Autorisez Checkout, Customers, Prices — ou utilisez sk_test_….";
      } else {
        connectionError = msg;
      }
    }
  } else {
    connectionError =
      "STRIPE_SECRET_KEY manquante dans .env.local à la racine du projet.";
  }

  const pricesReady = Object.values(prices).filter(Boolean).length;

  return NextResponse.json({
    configured: isStripeConfigured(),
    connected,
    connectionError,
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
