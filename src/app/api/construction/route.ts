import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  deleteConstructionEntity,
  getConstructionWorkspace,
  upsertConstructionEntity,
} from "@/lib/construction/construction-service";
import type { ConstructionEntityKey } from "@/lib/construction/workspace-types";

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

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET() {
  const cid = await companyId();
  const result = await getConstructionWorkspace(cid);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "upsert";
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
