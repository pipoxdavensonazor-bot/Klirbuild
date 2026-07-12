import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { createProject, listProjects } from "@/lib/projects/project-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET(request: Request) {
  const cid = await companyId();
  const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
  const projects = await listProjects(cid, clientId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const budget = typeof body.budget === "number" ? body.budget : Number(body.budget) || 0;

  const result = await createProject({
    companyId: cid,
    clientId,
    name,
    budget,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
