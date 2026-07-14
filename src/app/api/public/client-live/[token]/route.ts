import { NextResponse } from "next/server";
import {
  getLiveByShareToken,
  issueLiveJoinToken,
  listClientFeed,
} from "@/lib/meetings/feed-service";
import {
  getMeetingByShareToken,
  issueMeetingJoinToken,
} from "@/lib/meetings/meetings-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

/** Client portal access via share token (+ optional clientId). */
export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";

  const live = await getLiveByShareToken(token);
  const meeting = live ? null : await getMeetingByShareToken(token);

  if (!live && !meeting) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }

  const audience = live?.audience ?? meeting!.audience;
  if (audience !== "clients" && audience !== "public") {
    return NextResponse.json({ error: "Accès client refusé." }, { status: 403 });
  }

  let feed: Awaited<ReturnType<typeof listClientFeed>> | null = null;
  if (clientId) {
    feed = await listClientFeed(clientId, token);
  }

  return NextResponse.json({
    type: live ? "live" : "meeting",
    live: live ?? null,
    meeting: meeting ?? null,
    feed: feed && !("error" in feed) ? feed : null,
  });
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const userName =
    (typeof body.userName === "string" && body.userName.trim()) || "Client";

  const live = await getLiveByShareToken(token);
  if (live) {
    const result = await issueLiveJoinToken({
      shareToken: token,
      userName,
      asClient: true,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ type: "live", ...result });
  }

  const meeting = await getMeetingByShareToken(token);
  if (meeting) {
    const result = await issueMeetingJoinToken({
      meetingId: meeting.id,
      shareToken: token,
      userName,
      asClient: true,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ type: "meeting", ...result });
  }

  return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
}
