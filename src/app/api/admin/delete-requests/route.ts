import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import {
  isAdminDeleter,
  listDeleteRequests,
  requestSensitiveDelete,
  reviewDeleteRequest,
} from "@/lib/admin/delete-governance-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!isAdminDeleter(enriched.role)) {
    return NextResponse.json({ error: "Accès admin requis." }, { status: 403 });
  }

  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  const requests = await listDeleteRequests(enriched.companyId, status ?? undefined);
  return NextResponse.json({ requests, isAdmin: true });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "request";

  if (action === "request") {
    const result = await requestSensitiveDelete({
      companyId: enriched.companyId,
      role: enriched.role,
      email: enriched.email,
      resourceType: typeof body.resourceType === "string" ? body.resourceType : "",
      resourceId: typeof body.resourceId === "string" ? body.resourceId : "",
      resourceLabel:
        typeof body.resourceLabel === "string" ? body.resourceLabel : undefined,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "review") {
    const result = await reviewDeleteRequest({
      companyId: enriched.companyId,
      requestId: typeof body.requestId === "string" ? body.requestId : "",
      role: enriched.role,
      reviewerEmail: enriched.email,
      decision: body.decision === "reject" ? "reject" : "approve",
      note: typeof body.note === "string" ? body.note : undefined,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
