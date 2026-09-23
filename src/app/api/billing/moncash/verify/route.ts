import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import {
  deleteMonCashPlanOrder,
  loadMonCashPlanOrder,
  periodEndFromCycle,
  verifyMonCashPlanToken,
} from "@/lib/billing/moncash-plan-order";
import { activateFromMonCashPayment } from "@/lib/billing/subscription-service";
import {
  isMonCashConfigured,
  retrieveMonCashOrderPayment,
} from "@/lib/payments/moncash";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (auth instanceof NextResponse) return auth;

    if (!isMonCashConfigured()) {
      return NextResponse.json(
        { error: "MonCash n'est pas configuré.", configured: false },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!orderId) {
      return NextResponse.json({ error: "orderId requis" }, { status: 400 });
    }

    const fromToken = token ? verifyMonCashPlanToken(token) : null;
    const fromKv = await loadMonCashPlanOrder(orderId);
    const order = fromToken?.orderId === orderId ? fromToken : fromKv;

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Commande MonCash introuvable ou expirée. Relancez le paiement depuis Abonnements.",
        },
        { status: 404 }
      );
    }

    if (order.companyId !== auth.companyId) {
      return NextResponse.json({ error: "Commande non autorisée." }, { status: 403 });
    }

    const payment = await retrieveMonCashOrderPayment(order.orderId);
    if (!payment.successful) {
      return NextResponse.json(
        {
          ok: false,
          paid: false,
          message: payment.message || "Paiement MonCash non confirmé",
        },
        { status: 402 }
      );
    }

    if (payment.cost != null && Math.abs(payment.cost - order.amountHtg) > 1) {
      return NextResponse.json(
        {
          error: `Montant MonCash inattendu (payé ${payment.cost} HTG, attendu ${order.amountHtg} HTG).`,
        },
        { status: 400 }
      );
    }

    const billing = await activateFromMonCashPayment({
      companyId: order.companyId,
      plan: order.plan,
      cycle: order.cycle,
      email: order.email ?? auth.email,
      transactionId: payment.transactionId,
      periodEndsAt: periodEndFromCycle(order.cycle),
    });

    await deleteMonCashPlanOrder(order.orderId);

    return NextResponse.json({
      ok: true,
      paid: true,
      plan: billing.plan,
      billingCycle: billing.billingCycle,
      subscriptionStatus: billing.subscriptionStatus,
      transactionId: payment.transactionId,
      amountHtg: order.amountHtg,
    });
  } catch (err) {
    console.error("[moncash/verify]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur vérification MonCash",
      },
      { status: 500 }
    );
  }
}
