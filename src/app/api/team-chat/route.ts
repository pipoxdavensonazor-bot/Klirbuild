import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import {
  listTeamChat,
  sendTeamChatMessage,
} from "@/lib/chat/team-chat-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "chat:use")) {
    return NextResponse.json({ error: "Accès chat refusé." }, { status: 403 });
  }

  const url = new URL(request.url);
  const channelId = url.searchParams.get("channelId") ?? undefined;

  const data = await listTeamChat(
    enriched.companyId,
    enriched.email,
    enriched.email.split("@")[0]
  );

  if (channelId) {
    const { listChannelMessages } = await import("@/lib/chat/team-chat-service");
    const channelData = await listChannelMessages(enriched.companyId, channelId);
    if ("error" in channelData && channelData.error) {
      return NextResponse.json({ error: channelData.error }, { status: 404 });
    }
    return NextResponse.json({ ...data, messages: channelData.messages, channelId });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "chat:use")) {
    return NextResponse.json({ error: "Accès chat refusé." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body : "";
  const channelId = typeof body.channelId === "string" ? body.channelId : undefined;
  const senderName =
    typeof body.senderName === "string"
      ? body.senderName
      : enriched.email.split("@")[0];

  const result = await sendTeamChatMessage({
    companyId: enriched.companyId,
    email: enriched.email,
    senderName,
    body: text,
    channelId,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
