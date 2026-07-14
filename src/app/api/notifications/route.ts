import { NextResponse } from "next/server";
import { hasDatabase, requireSession } from "@/lib/auth/auth-service";
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from "@/lib/notifications/notification-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!hasDatabase()) {
    return NextResponse.json({ notifications: [], unread: 0 });
  }

  const [notifications, unread] = await Promise.all([
    listNotifications(session.companyId),
    unreadNotificationCount(session.companyId),
  ]);

  return NextResponse.json({ notifications, unread });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!hasDatabase()) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown) => typeof id === "string")
    : undefined;
  const result = await markNotificationsRead(session.companyId, ids);
  return NextResponse.json({ ok: true, ...result });
}
