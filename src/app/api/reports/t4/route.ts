import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import {
  availableT4TaxYears,
  buildT4SlipsForCompany,
} from "@/lib/reports/t4-service";
import { canApp } from "@/lib/workforce/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "payroll:read")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const url = new URL(request.url);
  const taxYear = Number(url.searchParams.get("taxYear")) || new Date().getFullYear();

  const slips = await buildT4SlipsForCompany(enriched.companyId, taxYear);
  return NextResponse.json({
    slips,
    taxYears: availableT4TaxYears(),
    taxYear,
  });
}
