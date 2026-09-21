import { NextResponse } from "next/server";
import {
  listLiveComments,
  postLiveComment,
  resolveLiveBySlug,
} from "@/lib/meetings/live-comments-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: Ctx) {
  const { slug } = await context.params;
  const live = await resolveLiveBySlug(slug);
  if (!live) {
    return NextResponse.json({ error: "Live introuvable." }, { status: 404 });
  }

  const url = new URL(request.url);
  const afterId = url.searchParams.get("after")?.trim() || undefined;
  const comments = await listLiveComments({
    liveSessionId: live.id,
    companyId: live.companyId,
    afterId,
  });
  return NextResponse.json({ comments, liveId: live.id });
}

export async function POST(request: Request, context: Ctx) {
  const { slug } = await context.params;
  const live = await resolveLiveBySlug(slug);
  if (!live) {
    return NextResponse.json({ error: "Live introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body : "";
  const authorName =
    typeof body.authorName === "string" ? body.authorName : "Spectateur";

  const result = await postLiveComment({
    liveSessionId: live.id,
    companyId: live.companyId,
    authorName,
    body: text,
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ comment: result.comment });
}
