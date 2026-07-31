import { prisma } from "@/lib/db";
import { hasDatabase } from "@/lib/auth/auth-service";

const MAX_BODY = 500;
const MAX_NAME = 80;

export type LiveCommentDto = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  authorUserId?: string | null;
};

function sanitizeBody(raw: string) {
  return raw.trim().slice(0, MAX_BODY);
}

function sanitizeName(raw: string) {
  return raw.trim().slice(0, MAX_NAME) || "Spectateur";
}

export async function listLiveComments(input: {
  liveSessionId: string;
  companyId: string;
  afterId?: string;
  limit?: number;
}): Promise<LiveCommentDto[]> {
  if (!hasDatabase()) return [];
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let afterCreatedAt: Date | undefined;
  if (input.afterId) {
    const anchor = await prisma.liveComment.findFirst({
      where: {
        id: input.afterId,
        liveSessionId: input.liveSessionId,
        companyId: input.companyId,
      },
      select: { createdAt: true },
    });
    afterCreatedAt = anchor?.createdAt;
  }

  const rows = await prisma.liveComment.findMany({
    where: {
      liveSessionId: input.liveSessionId,
      companyId: input.companyId,
      ...(afterCreatedAt ? { createdAt: { gt: afterCreatedAt } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    authorUserId: r.authorUserId,
  }));
}

export async function postLiveComment(input: {
  liveSessionId: string;
  companyId: string;
  authorName: string;
  body: string;
  authorUserId?: string;
}): Promise<{ comment?: LiveCommentDto; error?: string }> {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis." };
  }

  const body = sanitizeBody(input.body);
  if (!body) return { error: "Message vide." };

  const live = await prisma.liveSession.findFirst({
    where: {
      id: input.liveSessionId,
      companyId: input.companyId,
    },
    select: { id: true, status: true },
  });
  if (!live) return { error: "Live introuvable ou terminé." };
  if (live.status === "ended") return { error: "Le live est terminé." };

  const row = await prisma.liveComment.create({
    data: {
      companyId: input.companyId,
      liveSessionId: input.liveSessionId,
      authorName: sanitizeName(input.authorName),
      authorUserId: input.authorUserId,
      body,
    },
  });

  return {
    comment: {
      id: row.id,
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      authorUserId: row.authorUserId,
    },
  };
}

export async function resolveLiveBySlug(slug: string) {
  if (!hasDatabase()) return null;
  return prisma.liveSession.findFirst({
    where: { slug, status: { in: ["live", "active"] } },
    select: {
      id: true,
      companyId: true,
      title: true,
      status: true,
      slug: true,
      shareToken: true,
    },
  });
}
