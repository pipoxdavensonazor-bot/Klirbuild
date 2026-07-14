import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { canApp } from "@/lib/workforce/types";
import {
  createFeedPost,
  listFeedPosts,
  type FeedAudience,
} from "@/lib/meetings/feed-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!canApp(enriched.role, "meetings:join")) {
    return NextResponse.json({ error: "Accès feed refusé." }, { status: 403 });
  }

  const posts = await listFeedPosts(enriched.companyId, enriched.role);
  return NextResponse.json({
    posts,
    canPost: canApp(enriched.role, "posts:write"),
    canLive: canApp(enriched.role, "live:host"),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  const body = await request.json().catch(() => ({}));
  const audience = (
    body.audience === "clients" || body.audience === "public" || body.audience === "company"
      ? body.audience
      : "company"
  ) as FeedAudience;
  const clientIds = Array.isArray(body.clientIds)
    ? body.clientIds.filter((r: unknown): r is string => typeof r === "string")
    : [];

  const result = await createFeedPost({
    companyId: enriched.companyId,
    authorId: enriched.email,
    authorName: enriched.email,
    body: typeof body.body === "string" ? body.body : "",
    audience,
    role: enriched.role,
    startLive: Boolean(body.startLive),
    clientIds,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
