import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";
import { parseScanInput } from "@/lib/prospecting/parse-input";
import {
  importProspectHits,
  listProspectScans,
  runProspectScan,
  scanMeta,
} from "@/lib/prospecting/scan-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePermission("crm:read");
  if (auth instanceof NextResponse) return auth;
  const denied = await requireCompanyPlanFeature(auth.companyId, "crm");
  if (denied) return denied;
  const scans = await listProspectScans(auth.companyId);
  return NextResponse.json({ scans, meta: scanMeta() });
}

export async function POST(request: Request) {
  const auth = await requirePermission("crm:write");
  if (auth instanceof NextResponse) return auth;
  const denied = await requireCompanyPlanFeature(auth.companyId, "crm");
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "scan";

  if (action === "import") {
    const hitIds = Array.isArray(body.hitIds)
      ? body.hitIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const result = await importProspectHits(auth.companyId, hitIds, auth.session.email);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const parsed = parseScanInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await runProspectScan(auth.companyId, {
    ...parsed,
    createdByEmail: auth.session.email,
  });
  if ("error" in result && result.error && !("scan" in result && result.scan)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
