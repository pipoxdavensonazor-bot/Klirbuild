import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { getLocationsOverview } from "@/lib/locations/locations-service";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";
import { canApp } from "@/lib/workforce/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "location:view")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const denied = await requireCompanyPlanFeature(enriched.companyId, "locations");
  if (denied) return denied;

  const overview = await getLocationsOverview(enriched.companyId);
  return NextResponse.json(overview);
}
