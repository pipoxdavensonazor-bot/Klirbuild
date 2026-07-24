import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasDatabase } from "@/lib/auth/auth-service";

export const runtime = "nodejs";

/**
 * Daily webhook: room.ended / recording.ready-to-download
 * Configure in Daily dashboard → Webhooks → /api/daily/webhook
 */
export async function POST(request: Request) {
  const secret = process.env.DAILY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "DAILY_WEBHOOK_SECRET non configuré" },
        { status: 503 }
      );
    }
  } else {
    const header = request.headers.get("x-webhook-secret") || "";
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const event = await request.json().catch(() => null);
  if (!event || typeof event !== "object") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const type = String((event as { type?: string }).type || "");
  const payload = (event as { payload?: Record<string, unknown> }).payload || {};
  const roomName =
    typeof payload.room === "string"
      ? payload.room
      : typeof payload.room_name === "string"
        ? payload.room_name
        : "";

  if (!hasDatabase() || !roomName) {
    return NextResponse.json({ ok: true });
  }

  if (type.includes("ended") || type === "meeting.ended") {
    await prisma.meeting.updateMany({
      where: { dailyRoomName: roomName, status: { not: "ended" } },
      data: { status: "ended", endsAt: new Date() },
    });
    await prisma.liveSession.updateMany({
      where: { dailyRoomName: roomName, status: { not: "ended" } },
      data: { status: "ended", endedAt: new Date() },
    });
  }

  if (type.includes("recording") || type === "recording.ready-to-download") {
    const download =
      typeof payload.download_link === "string"
        ? payload.download_link
        : typeof payload.s3_key === "string"
          ? payload.s3_key
          : null;
    if (download) {
      await prisma.liveSession.updateMany({
        where: { dailyRoomName: roomName },
        data: { recordingUrl: download, status: "ended", endedAt: new Date() },
      });
      const lives = await prisma.liveSession.findMany({
        where: { dailyRoomName: roomName },
        select: { id: true },
      });
      for (const live of lives) {
        await prisma.feedPost.updateMany({
          where: { liveSessionId: live.id },
          data: { recordingUrl: download },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
