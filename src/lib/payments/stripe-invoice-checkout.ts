import type Stripe from "stripe";
import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

export const INVOICE_PAYMENT_PURPOSE = "invoice_payment";

function toCents(amount: number) {
  return Math.round(amount * 100);
}

export async function createInvoiceStripeCheckout(companyId: string, invoiceId: string) {
  if (!isStripeConfigured()) {
    return {
      error:
        "Stripe n'est pas configuré. Ajoutez STRIPE_SECRET_KEY et les Price IDs (voir STRIPE_SETUP.md)." as const,
    };
  }
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      client: { select: { name: true, email: true } },
      company: { select: { name: true } },
    },
  });

  if (!invoice) return { error: "Facture introuvable." as const };
  if (invoice.status === "paid") return { error: "Cette facture est déjà payée." as const };
  if (invoice.status === "cancelled") {
    return { error: "Impossible de payer une facture annulée." as const };
  }

  const total = typeof invoice.total === "number" ? invoice.total : invoice.total.toNumber();
  if (total <= 0) return { error: "Montant de facture invalide." as const };

  const currency = (invoice.currency || "CAD").toLowerCase();
  const stripe = getStripe();
  const base = appUrl();
  const companyName = invoice.company?.name ?? "KlirBuild";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toCents(total),
          product_data: {
            name: `Facture ${invoice.number}`,
            description: `${companyName} — ${invoice.client?.name ?? "Client"}`,
          },
        },
      },
    ],
    success_url: `${base}/invoices?paid=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/invoices?paid=cancel`,
    customer_email: invoice.client?.email ?? undefined,
    client_reference_id: invoice.id,
    metadata: {
      purpose: INVOICE_PAYMENT_PURPOSE,
      companyId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    },
    payment_intent_data: {
      metadata: {
        purpose: INVOICE_PAYMENT_PURPOSE,
        companyId,
        invoiceId: invoice.id,
      },
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return {
    url: session.url,
    sessionId: session.id,
    invoiceNumber: invoice.number,
  };
}

export async function syncInvoicePaymentFromCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.purpose !== INVOICE_PAYMENT_PURPOSE) {
    return { skipped: true as const };
  }
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const companyId = session.metadata.companyId;
  const invoiceId = session.metadata.invoiceId;
  if (!companyId || !invoiceId) {
    return { error: "Métadonnées facture manquantes." as const };
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { error: "Paiement non complété." as const };
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });
  if (!invoice) return { error: "Facture introuvable." as const };

  const amountTotal =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : typeof invoice.total === "number"
        ? invoice.total
        : invoice.total.toNumber();

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const existing = await prisma.payment.findFirst({
    where: {
      companyId,
      OR: [
        ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
        { stripeSessionId: session.id },
      ],
    },
  });

  if (!existing) {
    await prisma.payment.create({
      data: {
        companyId,
        invoiceId,
        amount: amountTotal,
        currency: (session.currency ?? invoice.currency ?? "cad").toUpperCase(),
        status: "succeeded",
        method: "stripe",
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      },
    });
  }

  if (invoice.status !== "paid") {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "paid",
        paidAt: new Date(),
        stripeCheckoutSessionId: session.id,
      },
    });
  }

  return { ok: true as const, invoiceId, companyId };
}
