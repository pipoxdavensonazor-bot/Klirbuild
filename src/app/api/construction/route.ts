import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  deleteConstructionEntity,
  getConstructionWorkspace,
  saveAiSuggestions,
  upsertConstructionEntity,
} from "@/lib/construction/construction-service";
import type { ConstructionEntityKey } from "@/lib/construction/workspace-types";
import { requireCompanyPlanFeature } from "@/lib/billing/require-plan-server";

export const runtime = "nodejs";

const ENTITIES: ConstructionEntityKey[] = [
  "jobs",
  "estimates",
  "changeOrders",
  "leads",
  "ccqWorkers",
  "ccqDeclarations",
  "progressInvoices",
  "marketingCampaigns",
];

async function companyId(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const denied = await requireCompanyPlanFeature(cid, "construction_os");
  if (denied) return denied;
  const result = await getConstructionWorkspace(cid);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const denied = await requireCompanyPlanFeature(cid, "construction_os");
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "upsert";

  if (action === "save_ai_suggestions") {
    const suggestions = Array.isArray(body.suggestions)
      ? body.suggestions.filter((s: unknown) => typeof s === "string")
      : [];
    const result = await saveAiSuggestions(cid, suggestions);
    return NextResponse.json(result);
  }

  const entity = body.entity as ConstructionEntityKey;
  const id = typeof body.id === "string" ? body.id : undefined;
  const data = body.data && typeof body.data === "object" ? body.data : {};

  if (!ENTITIES.includes(entity)) {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }

  if (action === "delete") {
    if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
    const result = await deleteConstructionEntity(cid, entity, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const result = await upsertConstructionEntity(cid, entity, { id, data });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}
