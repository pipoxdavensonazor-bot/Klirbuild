import { NextResponse } from "next/server";
import { getRequestSession, requireSession } from "@/lib/auth/auth-service";
import { getBillingState } from "@/lib/billing/subscription-service";
import {
  appUrl,
  getStripe,
  isStripeConfigured,
  priceIdForPlan,
  type PaidPlanId,
} from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (auth instanceof NextResponse) return auth;

    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe n'est pas configuré. Ajoutez STRIPE_SECRET_KEY dans .env.local (utilisez une clé TEST).",
          demo: true,
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const plan = body.plan as PaidPlanId;
    const cycle = (body.cycle as "monthly" | "yearly") || "monthly";
    const email = auth.email;
    const billing = await getBillingState(auth.companyId);
    const customerId =
      (typeof body.customerId === "string" ? body.customerId : undefined) ||
      billing.stripeCustomerId ||
      undefined;

    if (!plan || !["starter", "growth", "business"].includes(plan)) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const priceId = priceIdForPlan(plan, cycle);
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Price ID manquant pour ${plan}/${cycle}. Créez le prix dans Stripe et renseignez STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()} dans .env.local.`,
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const base = appUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing?checkout=cancel`,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : email,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          plan,
          cycle,
          product: "klirbuild",
          companyId: auth.companyId,
        },
      },
      metadata: {
        plan,
        cycle,
        product: "klirbuild",
        companyId: auth.companyId,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout error";
    console.error("[stripe/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
