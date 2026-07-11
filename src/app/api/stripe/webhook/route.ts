import { NextResponse } from "next/server";
import {
  getBillingState,
  syncFromCheckoutSession,
  syncFromStripeSubscription,
  updateBillingStatus,
} from "@/lib/billing/subscription-service";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

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
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Webhook secret required" }, { status: 400 });
    } else {
      event = JSON.parse(rawBody) as Stripe.Event;
      console.warn("[stripe/webhook] Dev mode — signature not verified");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook";
    console.error("[stripe/webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await syncFromCheckoutSession(session);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncFromStripeSubscription(sub);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;
      const current = await getBillingState();
      if (current.stripeCustomerId === customerId) {
        await updateBillingStatus(current.companyId, "active");
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;
      const current = await getBillingState();
      if (current.stripeCustomerId === customerId) {
        await updateBillingStatus(current.companyId, "past_due");
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true, type: event.type });
}
