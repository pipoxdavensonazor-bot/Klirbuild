import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { getAnalyticsStats } from "@/lib/analytics/analytics-service";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getRequestSession();
  const companyId = session
    ? (await enrichSession(session)).companyId
    : DEMO_COMPANY_ID;
  const denied = await requireCompanyPlanFeature(companyId, "analytics");
  if (denied) return denied;
  const stats = await getAnalyticsStats(companyId);
  return NextResponse.json(stats);
}
