import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import {
  getMeeting,
  issueMeetingJoinToken,
  updateMeetingStatus,
  type MeetingStatus,
} from "@/lib/meetings/meetings-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const { id } = await params;

  if (!canApp(enriched.role, "meetings:join")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const meeting = await getMeeting(enriched.companyId, id);
  if (!meeting) {
    return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });
  }
  return NextResponse.json({ meeting });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const { id } = await params;

  if (!canApp(enriched.role, "meetings:host")) {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status as MeetingStatus;
  if (!["scheduled", "live", "ended"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const result = await updateMeetingStatus(enriched.companyId, id, status);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: Params) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "token";

  if (action === "token") {
    const result = await issueMeetingJoinToken({
      meetingId: id,
      companyId: enriched.companyId,
      userName: enriched.email,
      userId: enriched.email,
      role: enriched.role,
      isHost: canApp(enriched.role, "meetings:host"),
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
