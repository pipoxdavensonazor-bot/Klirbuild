import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { listPayrollEmployees, listPayslips } from "@/lib/payroll/payroll-service";

export const runtime = "nodejs";

async function cid() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  return (await enrichSession(session)).companyId;
}

export async function GET() {
  const companyId = await cid();
  const [payslips, employees] = await Promise.all([
    listPayslips(companyId),
    listPayrollEmployees(companyId),
  ]);
  return NextResponse.json({ payslips, employees });
}
