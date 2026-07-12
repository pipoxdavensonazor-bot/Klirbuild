import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { getDashboardStats } from "@/lib/dashboard/dashboard-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getRequestSession();
  const companyId = session
    ? (await enrichSession(session)).companyId
    : DEMO_COMPANY_ID;
  const stats = await getDashboardStats(companyId);
  return NextResponse.json(stats);
}
