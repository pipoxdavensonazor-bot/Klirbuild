import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import {
  buildMonCashPlanOrder,
  isPaidBillingPlan,
  signMonCashPlanOrder,
  storeMonCashPlanOrder,
  type BillingCycle,
} from "@/lib/billing/moncash-plan-order";
import { createMonCashPayment, isMonCashConfigured } from "@/lib/payments/moncash";
import { appUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (auth instanceof NextResponse) return auth;

    if (!isMonCashConfigured()) {
      return NextResponse.json(
        {
          error:
            "MonCash n'est pas configuré. Ajoutez MONCASH_CLIENT_ID et MONCASH_CLIENT_SECRET.",
          configured: false,
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const plan = String(body.plan || "");
    const cycle = (body.cycle === "yearly" ? "yearly" : "monthly") as BillingCycle;

    if (!isPaidBillingPlan(plan)) {
      return NextResponse.json(
        { error: "Plan invalide pour MonCash (starter, growth ou business)." },
        { status: 400 }
      );
    }

    const order = buildMonCashPlanOrder({
      companyId: auth.companyId,
      email: auth.email,
      plan,
      cycle,
    });

    await storeMonCashPlanOrder(order);

    const { paymentUrl, paymentToken } = await createMonCashPayment({
      amountHtg: order.amountHtg,
      orderId: order.orderId,
    });

    const token = signMonCashPlanOrder(order);
    const returnUrl = `${appUrl()}/billing?moncash=1&orderId=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      ok: true,
      paymentUrl,
      paymentToken,
      orderId: order.orderId,
      amountHtg: order.amountHtg,
      amountCad: order.amountCad,
      plan: order.plan,
      cycle: order.cycle,
      token,
      returnUrl,
    });
  } catch (err) {
    console.error("[moncash/checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur MonCash checkout" },
      { status: 500 }
    );
  }
}
