import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import {
  createMeeting,
  listMeetings,
  type MeetingAudience,
} from "@/lib/meetings/meetings-service";
import { isDailyConfigured } from "@/lib/meetings/daily-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "meetings:join")) {
    return NextResponse.json({ error: "Accès réunions refusé." }, { status: 403 });
  }

  const meetings = await listMeetings(enriched.companyId);
  return NextResponse.json({
    meetings,
    dailyConfigured: isDailyConfigured(),
    canHost: canApp(enriched.role, "meetings:host"),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "meetings:host")) {
    return NextResponse.json({ error: "Permission création refusée." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "";
  const audience = (
    body.audience === "clients" || body.audience === "public" || body.audience === "company"
      ? body.audience
      : "company"
  ) as MeetingAudience;
  const allowedRoles = Array.isArray(body.allowedRoles)
    ? body.allowedRoles.filter((r: unknown): r is string => typeof r === "string")
    : [];
  const clientIds = Array.isArray(body.clientIds)
    ? body.clientIds.filter((r: unknown): r is string => typeof r === "string")
    : [];

  const result = await createMeeting({
    companyId: enriched.companyId,
    title,
    audience,
    hostUserId: enriched.email,
    hostName: enriched.email,
    allowedRoles,
    clientIds,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
