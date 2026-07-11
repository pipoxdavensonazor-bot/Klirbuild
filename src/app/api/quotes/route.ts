import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { listQuotes } from "@/lib/quotes/quote-service";

export async function GET() {
  const session = await getRequestSession();
  const companyId = session?.companyId ?? DEMO_COMPANY_ID;
  const quotes = await listQuotes(companyId);
  return NextResponse.json({ quotes });
}
