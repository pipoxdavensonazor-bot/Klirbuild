import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/lib/api-keys/api-key-service";

export const runtime = "nodejs";

/**
 * API keys grant programmatic access to the tenant — restrict to company admins
 * (`company:manage`), not the broader `settings:manage` (e.g. SAFETY_OFFICER).
 */
export async function GET() {
  const auth = await requirePermission("company:manage");
  if (auth instanceof NextResponse) return auth;
  const keys = await listApiKeys(auth.companyId);
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const auth = await requirePermission("company:manage");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "revoke") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID requis." }, { status: 400 });
    const result = await revokeApiKey(auth.companyId, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const name = typeof body.name === "string" ? body.name : "API key";
  const result = await createApiKey(auth.companyId, name);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }
  return NextResponse.json(result);
}
