import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/require-company";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/api-keys/api-key-service";

export const runtime = "nodejs";

async function companyId(): Promise<string | NextResponse> {
  const ctx = await requireCompanyContext();
  if (ctx instanceof NextResponse) return ctx;
  return ctx.companyId;
}

export async function GET() {
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;
  const keys = await listApiKeys(cid);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "create";
  const cid = await companyId();
  if (cid instanceof NextResponse) return cid;

  if (action === "revoke") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
    const result = await revokeApiKey(cid, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const name = typeof body.name === "string" ? body.name : "API key";
  const result = await createApiKey(cid, name);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json(result);
}
