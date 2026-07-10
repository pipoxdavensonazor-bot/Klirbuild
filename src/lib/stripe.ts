import Stripe from "stripe";

function getSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function isStripeConfigured() {
  return Boolean(getSecretKey());
}

export function getStripe() {
  const key = getSecretKey();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquante. Ajoutez-la dans .env.local (clé test sk_test_… ou rk_test_…)."
    );
  }
  if (key.startsWith("rk_live_") || key.startsWith("sk_live_")) {
    if (process.env.STRIPE_ALLOW_LIVE !== "true" && process.env.NODE_ENV !== "production") {
      throw new Error(
        "Clé Stripe LIVE détectée en développement. Utilisez une clé TEST (sk_test_/rk_test_) ou définissez STRIPE_ALLOW_LIVE=true uniquement en production."
      );
    }
  }
  return new Stripe(key, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
}

export type PaidPlanId = "starter" | "growth" | "business";

export function priceIdForPlan(
  plan: PaidPlanId,
  cycle: "monthly" | "yearly"
): string | null {
  const map: Record<PaidPlanId, Record<"monthly" | "yearly", string | undefined>> = {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    },
    growth: {
      monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
      yearly: process.env.STRIPE_PRICE_GROWTH_YEARLY,
    },
    business: {
      monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
      yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
    },
  };
  const id = map[plan]?.[cycle]?.trim();
  return id || null;
}

export function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
