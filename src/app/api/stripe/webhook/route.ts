import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // Local/dev without webhook secret — parse only (never use in production)
      event = JSON.parse(rawBody) as Stripe.Event;
      console.warn(
        "[stripe/webhook] STRIPE_WEBHOOK_SECRET missing — signature not verified"
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook";
    console.error("[stripe/webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.info("[stripe] checkout.session.completed", {
        customer: session.customer,
        subscription: session.subscription,
        plan: session.metadata?.plan,
      });
      // TODO: persist company.plan + stripeCustomerId in Prisma when DB is live
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      console.info(`[stripe] ${event.type}`, {
        id: sub.id,
        status: sub.status,
        customer: sub.customer,
      });
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.info(`[stripe] ${event.type}`, {
        id: invoice.id,
        customer: invoice.customer,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true, type: event.type });
}
