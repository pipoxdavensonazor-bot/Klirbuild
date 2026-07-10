import { NextResponse } from "next/server";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe n'est pas configuré." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const customerId = body.customerId as string | undefined;
    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "customerId requis. Après un premier paiement, le webhook enregistre le Stripe Customer ID.",
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
