import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  deleteJobSite,
  updateJobSite,
} from "@/lib/construction/job-site-service";

export const runtime = "nodejs";

async function companyId(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const body = await request.json().catch(() => ({}));
  const result = await updateJobSite(cid, id, {
    name: typeof body.name === "string" ? body.name : undefined,
    address: typeof body.address === "string" ? body.address : undefined,
    clientName: typeof body.clientName === "string" ? body.clientName : undefined,
    lat: body.lat !== undefined ? Number(body.lat) : undefined,
    lng: body.lng !== undefined ? Number(body.lng) : undefined,
    radiusM: body.radiusM !== undefined ? Number(body.radiusM) : undefined,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const result = await deleteJobSite(cid, id);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}
