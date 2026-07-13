import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import {
  createTeamChannel,
  listTeamChat,
  sendTeamChatMessage,
} from "@/lib/chat/team-chat-service";
import type { Role } from "@/types";

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
    enriched.email.split("@")[0],
    enriched.role
  );

  if (channelId) {
    const { listChannelMessages } = await import("@/lib/chat/team-chat-service");
    const channelData = await listChannelMessages(
      enriched.companyId,
      channelId,
      enriched.email,
      enriched.role
    );
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
  const action = typeof body.action === "string" ? body.action : "message";

  if (action === "create-channel") {
    if (!canApp(enriched.role, "chat:moderate") && !canApp(enriched.role, "users:manage")) {
      return NextResponse.json({ error: "Permission création de groupe refusée." }, { status: 403 });
    }

    const allowedRoles = Array.isArray(body.allowedRoles)
      ? body.allowedRoles.filter((r: unknown): r is Role => typeof r === "string")
      : [];
    const memberEmails = Array.isArray(body.memberEmails)
      ? body.memberEmails.filter((e: unknown): e is string => typeof e === "string")
      : [];

    const result = await createTeamChannel({
      companyId: enriched.companyId,
      creatorEmail: enriched.email,
      name: typeof body.name === "string" ? body.name : "",
      description: typeof body.description === "string" ? body.description : undefined,
      allowedRoles,
      memberEmails,
    });

    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const text = typeof body.body === "string" ? body.body : "";
  const channelId = typeof body.channelId === "string" ? body.channelId : undefined;
  const senderName =
    typeof body.senderName === "string"
      ? body.senderName
      : enriched.email.split("@")[0];

  const result = await sendTeamChatMessage({
    companyId: enriched.companyId,
    email: enriched.email,
    role: enriched.role,
    senderName,
    body: text,
    channelId,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
