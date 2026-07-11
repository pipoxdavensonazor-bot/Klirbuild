import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import { getBillingState } from "@/lib/billing/subscription-service";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (auth instanceof NextResponse) return auth;

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe n'est pas configuré." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const billing = await getBillingState(auth.companyId);
    const customerId =
      (typeof body.customerId === "string" ? body.customerId : null) ||
      billing.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "Aucun client Stripe. Effectuez d'abord un paiement test sur /billing.",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal error";
    console.error("[stripe/portal]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
