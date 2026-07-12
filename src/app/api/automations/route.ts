import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  listAutomations,
  runAutomation,
  runCompanyAutomations,
  upsertAutomation,
} from "@/lib/automations/automation-service";

export const runtime = "nodejs";

async function cid() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  return (await enrichSession(session)).companyId;
}

export async function GET() {
  const automations = await listAutomations(await cid());
  return NextResponse.json({ automations });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "upsert";
  const companyId = await cid();

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
