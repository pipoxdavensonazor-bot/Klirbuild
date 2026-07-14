import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import {
  issueLiveJoinToken,
  startLiveSession,
  stopLiveSession,
  type FeedAudience,
} from "@/lib/meetings/feed-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";

  if (id === "new" && action === "start") {
    const audience = (
      body.audience === "clients" || body.audience === "public" || body.audience === "company"
        ? body.audience
        : "company"
    ) as FeedAudience;
    const result = await startLiveSession({
      companyId: enriched.companyId,
      role: enriched.role,
      title: typeof body.title === "string" ? body.title : undefined,
      audience,
      meetingId: typeof body.meetingId === "string" ? body.meetingId : undefined,
      clientIds: Array.isArray(body.clientIds)
        ? body.clientIds.filter((r: unknown): r is string => typeof r === "string")
        : [],
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "stop") {
    const result = await stopLiveSession(
      enriched.companyId,
      id,
      enriched.role,
      typeof body.recordingUrl === "string" ? body.recordingUrl : undefined
    );
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "token") {
    const result = await issueLiveJoinToken({
      liveId: id,
      companyId: enriched.companyId,
      userName: enriched.email,
      userId: enriched.email,
      role: enriched.role,
      isHost: canApp(enriched.role, "live:host"),
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
