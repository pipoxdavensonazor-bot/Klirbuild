import { NextResponse } from "next/server";
import {
  getLiveBySlug,
  issueLiveJoinToken,
} from "@/lib/meetings/feed-service";
import {
  getMeetingBySlug,
  issueMeetingJoinToken,
} from "@/lib/meetings/meetings-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

/** Public live / meeting join by slug (audience=public). */
export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const live = await getLiveBySlug(slug);
  if (live) {
    if (live.audience !== "public") {
      return NextResponse.json({ error: "Live non public." }, { status: 403 });
    }
    return NextResponse.json({ type: "live", live });
  }

  const meeting = await getMeetingBySlug(slug);
  if (meeting) {
    if (meeting.audience !== "public") {
      return NextResponse.json({ error: "Réunion non publique." }, { status: 403 });
    }
    return NextResponse.json({ type: "meeting", meeting });
  }

  return NextResponse.json({ error: "Introuvable." }, { status: 404 });
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const userName =
    (typeof body.userName === "string" && body.userName.trim()) || "Spectateur";

  const live = await getLiveBySlug(slug);
  if (live) {
    const result = await issueLiveJoinToken({
      slug,
      userName,
      asPublic: true,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ type: "live", ...result });
  }

  const meeting = await getMeetingBySlug(slug);
  if (meeting) {
    const result = await issueMeetingJoinToken({
      meetingId: meeting.id,
      userName,
      asPublic: true,
    });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    return NextResponse.json({ type: "meeting", ...result });
  }

  return NextResponse.json({ error: "Introuvable." }, { status: 404 });
}
