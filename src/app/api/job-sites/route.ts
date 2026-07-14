import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  createJobSite,
  listJobSitesAdmin,
} from "@/lib/construction/job-site-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  const enriched = await enrichSession(session);
  return enriched.companyId;
}

export async function GET() {
  const cid = await companyId();
  const jobSites = await listJobSitesAdmin(cid);
  return NextResponse.json({ jobSites });
}

export async function POST(request: Request) {
  const cid = await companyId();
  const body = await request.json().catch(() => ({}));
  const result = await createJobSite(cid, {
    name: typeof body.name === "string" ? body.name : "",
    address: typeof body.address === "string" ? body.address : undefined,
    clientName: typeof body.clientName === "string" ? body.clientName : undefined,
    lat: Number(body.lat) || undefined,
    lng: Number(body.lng) || undefined,
    radiusM: Number(body.radiusM) || undefined,
  });
  if ("error" in result && result.error) {
    const status = result.error.includes("Limite de chantiers") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(result);
}
