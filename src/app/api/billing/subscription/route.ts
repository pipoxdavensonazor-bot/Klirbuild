import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { getBillingState } from "@/lib/billing/subscription-service";

export async function GET() {
  const auth = await requireCompanyContext();
  if (auth instanceof NextResponse) return auth;
  const sub = await getBillingState(auth.companyId);
  return NextResponse.json({
    companyId: sub.companyId,
    plan: sub.plan,
    billingCycle: sub.billingCycle,
    subscriptionStatus: sub.subscriptionStatus,
    stripeCustomerId: sub.stripeCustomerId,
    hasStripeCustomer: Boolean(sub.stripeCustomerId),
  });
}
