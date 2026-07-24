import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import { getDashboardStats } from "@/lib/dashboard/dashboard-service";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  const companyId = ctx.companyId;
  const stats = await getDashboardStats(companyId);
  return NextResponse.json(stats);
}
