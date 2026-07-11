import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { listInvoices } from "@/lib/invoices/invoice-service";

export async function GET() {
  const session = await getRequestSession();
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const invoices = await listInvoices(companyId);
  return NextResponse.json({ invoices });
}
