import { NextResponse } from "next/server";
import { syncFromCheckoutSession } from "@/lib/billing/subscription-service";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function GET(request: Request) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
    }

    const sessionId = new URL(request.url).searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id requis" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.status !== "complete") {
      return NextResponse.json(
        { error: "Session non finalisée", status: session.status },
        { status: 402 }
      );
    }

    const sub = await syncFromCheckoutSession(session);

    return NextResponse.json({
      ok: true,
      plan: sub.plan,
      billingCycle: sub.billingCycle,
      subscriptionStatus: sub.subscriptionStatus,
      stripeCustomerId: sub.stripeCustomerId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
