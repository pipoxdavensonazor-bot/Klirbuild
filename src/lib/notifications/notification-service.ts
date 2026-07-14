import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";

export async function createNotification(input: {
  companyId: string;
  title: string;
  body?: string;
  href?: string;
  userId?: string;
}) {
  if (!hasDatabase()) return null;
  try {
    return await prisma.notification.create({
      data: {
        companyId: input.companyId,
        title: input.title,
        body: input.body,
        href: input.href,
        userId: input.userId,
      },
    });
  } catch (e) {
    console.warn(
      "[notifications] create failed:",
      e instanceof Error ? e.message : e
    );
    return null;
  }
}

export async function listNotifications(companyId: string, limit = 30) {
  if (!hasDatabase()) return [];
  try {
    return await prisma.notification.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function markNotificationsRead(companyId: string, ids?: string[]) {
  if (!hasDatabase()) return { count: 0 };
  try {
    const result = await prisma.notification.updateMany({
      where: {
        companyId,
        readAt: null,
        ...(ids?.length ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  } catch {
    return { count: 0 };
  }
}

export async function unreadNotificationCount(companyId: string) {
  if (!hasDatabase()) return 0;
  try {
    return await prisma.notification.count({
      where: { companyId, readAt: null },
    });
  } catch {
    return 0;
  }
}
