import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import { listDocuments, upsertDocument } from "@/lib/documents/document-service";

export const runtime = "nodejs";

async function cid() {
  const session = await getRequestSession();
  if (!session) return DEMO_COMPANY_ID;
  return (await enrichSession(session)).companyId;
}

export async function GET() {
  const documents = await listDocuments(await cid());
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await upsertDocument(await cid(), {
    id: typeof body.id === "string" ? body.id : undefined,
    name: typeof body.name === "string" ? body.name : "",
    folderName: typeof body.folderName === "string" ? body.folderName : undefined,
    type: typeof body.type === "string" ? body.type : undefined,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : undefined,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
