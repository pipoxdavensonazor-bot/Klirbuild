import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  listAutomations,
  runAutomation,
  runCompanyAutomations,
  upsertAutomation,
} from "@/lib/automations/automation-service";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";

export const runtime = "nodejs";

async function cid(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const companyId = await cid();
  if (companyId instanceof NextResponse) return companyId;
  const denied = await requireCompanyPlanFeature(companyId, "automations");
  if (denied) return denied;
  const automations = await listAutomations(companyId);
  return NextResponse.json({ automations });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "upsert";
  const companyId = await cid();
  if (companyId instanceof NextResponse) return companyId;
  const denied = await requireCompanyPlanFeature(companyId, "automations");
  if (denied) return denied;

  if (action === "run") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      const batch = await runCompanyAutomations(companyId);
      if ("error" in batch && batch.error) {
        return NextResponse.json({ error: batch.error }, { status: 503 });
      }
      return NextResponse.json(batch);
    }
    const result = await runAutomation(companyId, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const result = await upsertAutomation(companyId, {
    id: typeof body.id === "string" ? body.id : undefined,
    name: typeof body.name === "string" ? body.name : "",
    trigger: typeof body.trigger === "string" ? body.trigger : "manual",
    active: typeof body.active === "boolean" ? body.active : undefined,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
