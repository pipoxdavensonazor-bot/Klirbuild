import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  createJobSite,
  listJobSitesAdmin,
} from "@/lib/construction/job-site-service";

export const runtime = "nodejs";

async function companyId(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const jobSites = await listJobSitesAdmin(cid);
  return NextResponse.json({ jobSites });
}

export async function POST(request: Request) {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
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
