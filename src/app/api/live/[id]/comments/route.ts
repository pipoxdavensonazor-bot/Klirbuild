import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import {
  listLiveComments,
  postLiveComment,
} from "@/lib/meetings/live-comments-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function loadLiveForCompany(liveId: string, companyId: string) {
  return prisma.liveSession.findFirst({
    where: { id: liveId, companyId },
    select: { id: true, status: true },
  });
}

export async function GET(request: Request, context: Ctx) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const live = await loadLiveForCompany(id, session.companyId);
  if (!live) {
    return NextResponse.json({ error: "Live introuvable." }, { status: 404 });
  }

  const url = new URL(request.url);
  const afterId = url.searchParams.get("after")?.trim() || undefined;
  const comments = await listLiveComments({
    liveSessionId: id,
    companyId: session.companyId,
    afterId,
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: Ctx) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const live = await loadLiveForCompany(id, session.companyId);
  if (!live) {
    return NextResponse.json({ error: "Live introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body : "";
  const user = await prisma.user.findUnique({
    where: { email: session.email },
    select: { id: true, name: true },
  });
  const result = await postLiveComment({
    liveSessionId: id,
    companyId: session.companyId,
    authorName: user?.name || session.email.split("@")[0] || "Modérateur",
    authorUserId: user?.id,
    body: text,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ comment: result.comment });
}
