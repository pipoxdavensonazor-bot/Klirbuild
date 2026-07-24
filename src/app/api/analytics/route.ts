import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { getAnalyticsStats } from "@/lib/analytics/analytics-service";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  const companyId = ctx.companyId;
  const denied = await requireCompanyPlanFeature(companyId, "analytics");
  if (denied) return denied;
  const stats = await getAnalyticsStats(companyId);
  return NextResponse.json(stats);
}
