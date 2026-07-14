import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import {
  canViewPresenceBoard,
  listOfficePresence,
  sendPresenceMessage,
  startPrivateVideoCall,
} from "@/lib/admin/presence-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canViewPresenceBoard(enriched.role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const people = await listOfficePresence(enriched.companyId);
  return NextResponse.json({
    people,
    presentCount: people.length,
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const targetEmail = typeof body.targetEmail === "string" ? body.targetEmail : "";
  const targetName = typeof body.targetName === "string" ? body.targetName : targetEmail;

  if (action === "message") {
    const result = await sendPresenceMessage({
      companyId: enriched.companyId,
      adminEmail: enriched.email,
      adminRole: enriched.role,
      targetEmail,
      targetName,
      body: typeof body.body === "string" ? body.body : "",
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "private-call") {
    const result = await startPrivateVideoCall({
      companyId: enriched.companyId,
      adminEmail: enriched.email,
      adminRole: enriched.role,
      targetEmail,
      targetName,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
