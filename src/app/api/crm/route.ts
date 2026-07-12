import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  crmKpis,
  deleteDeal,
  deleteLead,
  listDeals,
  listLeads,
  upsertDeal,
  upsertLead,
} from "@/lib/crm/crm-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET() {
  const cid = await companyId();
  const [leads, deals] = await Promise.all([listLeads(cid), listDeals(cid)]);
  return NextResponse.json({ leads, deals, kpis: crmKpis(leads, deals) });
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const entity = body.entity === "deal" ? "deal" : "lead";
  const action = typeof body.action === "string" ? body.action : "upsert";

  if (action === "delete") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
    const result =
      entity === "deal" ? await deleteDeal(cid, id) : await deleteLead(cid, id);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  if (entity === "deal") {
    const result = await upsertDeal(cid, {
      id: typeof body.id === "string" ? body.id : undefined,
      title: typeof body.title === "string" ? body.title : "",
      clientName: typeof body.clientName === "string" ? body.clientName : undefined,
      value: typeof body.value === "number" ? body.value : undefined,
      stage: typeof body.stage === "string" ? body.stage : undefined,
      owner: typeof body.owner === "string" ? body.owner : undefined,
      closeDate: typeof body.closeDate === "string" ? body.closeDate : undefined,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const result = await upsertLead(cid, {
    id: typeof body.id === "string" ? body.id : undefined,
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : undefined,
    source: typeof body.source === "string" ? body.source : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    score: typeof body.score === "number" ? body.score : undefined,
    owner: typeof body.owner === "string" ? body.owner : undefined,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
