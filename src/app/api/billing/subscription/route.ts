import { NextResponse } from "next/server";
import { getRequestSession, hasDatabase } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { getBillingState } from "@/lib/billing/subscription-service";

export async function GET() {
  const session = await getRequestSession();
  if (!session && hasDatabase()) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const sub = await getBillingState(companyId);
  return NextResponse.json({
    companyId: sub.companyId,
    plan: sub.plan,
    billingCycle: sub.billingCycle,
    subscriptionStatus: sub.subscriptionStatus,
    stripeCustomerId: sub.stripeCustomerId,
    hasStripeCustomer: Boolean(sub.stripeCustomerId),
  });
}
