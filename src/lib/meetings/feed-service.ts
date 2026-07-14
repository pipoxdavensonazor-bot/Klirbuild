import { randomBytes } from "crypto";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { canApp } from "@/lib/workforce/types";
import type { Role } from "@/types";
import {
  createDailyRoom,
  createMeetingToken,
  type DailyAudience,
} from "@/lib/meetings/daily-service";

export type FeedAudience = DailyAudience;

function slugBase(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "live"
  );
}

function mapLive(row: {
  id: string;
  companyId: string;
  meetingId: string | null;
  title: string | null;
  dailyRoomName: string;
  dailyRoomUrl: string;
  status: string;
  audience: string;
  slug: string;
  shareToken: string;
  startedAt: Date | null;
  endedAt: Date | null;
  recordingUrl: string | null;
  clientIds: string[];
  createdAt: Date;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    meetingId: row.meetingId ?? undefined,
    title: row.title ?? undefined,
    dailyRoomName: row.dailyRoomName,
    dailyRoomUrl: row.dailyRoomUrl,
    status: row.status as "scheduled" | "live" | "ended",
    audience: row.audience as FeedAudience,
    slug: row.slug,
    shareToken: row.shareToken,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    recordingUrl: row.recordingUrl ?? undefined,
    clientIds: row.clientIds,
    createdAt: row.createdAt.toISOString(),
    publicPath: `/live/${row.slug}`,
    clientPath: `/client-live/${row.shareToken}`,
  };
}

function mapPost(row: {
  id: string;
  companyId: string;
  authorId: string | null;
  authorName: string;
  body: string;
  audience: string;
  liveSessionId: string | null;
  recordingUrl: string | null;
  visibilityRoles: string[];
  clientIds: string[];
  createdAt: Date;
  liveSession?: {
    id: string;
    status: string;
    slug: string;
    shareToken: string;
    dailyRoomUrl: string;
    recordingUrl: string | null;
    audience: string;
  } | null;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    authorId: row.authorId ?? undefined,
    authorName: row.authorName,
    body: row.body,
    audience: row.audience as FeedAudience,
    liveSessionId: row.liveSessionId ?? undefined,
    recordingUrl: row.recordingUrl ?? row.liveSession?.recordingUrl ?? undefined,
    visibilityRoles: row.visibilityRoles,
    clientIds: row.clientIds,
    createdAt: row.createdAt.toISOString(),
    live: row.liveSession
      ? {
          id: row.liveSession.id,
          status: row.liveSession.status,
          slug: row.liveSession.slug,
          shareToken: row.liveSession.shareToken,
          dailyRoomUrl: row.liveSession.dailyRoomUrl,
          recordingUrl: row.liveSession.recordingUrl ?? undefined,
          audience: row.liveSession.audience,
          publicPath: `/live/${row.liveSession.slug}`,
          clientPath: `/client-live/${row.liveSession.shareToken}`,
        }
      : null,
  };
}

export async function listFeedPosts(
  companyId: string,
  role: Role,
  opts?: { audience?: FeedAudience; clientId?: string }
) {
  if (!hasDatabase()) return [];
  const rows = await prisma.feedPost.findMany({
    where: {
      companyId,
      ...(opts?.audience ? { audience: opts.audience } : {}),
    },
    include: { liveSession: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows
    .filter((p) => {
      if (p.visibilityRoles.length && !p.visibilityRoles.includes(role)) {
        return false;
      }
      if (opts?.clientId) {
        if (p.audience !== "clients" && p.audience !== "public") return false;
        if (p.clientIds.length && !p.clientIds.includes(opts.clientId)) {
          return false;
        }
      }
      return true;
    })
    .map(mapPost);
}

export async function listClientFeed(clientId: string, shareToken: string) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  const live = await prisma.liveSession.findFirst({
    where: { shareToken, OR: [{ clientIds: { has: clientId } }, { audience: "public" }] },
  });
  const meeting = !live
    ? await prisma.meeting.findFirst({
        where: {
          shareToken,
          OR: [{ clientIds: { has: clientId } }, { audience: "public" }],
        },
      })
    : null;

  if (!live && !meeting) {
    // Allow feed by clientId when any company post targets this client
    const posts = await prisma.feedPost.findMany({
      where: {
        audience: { in: ["clients", "public"] },
        OR: [
          { clientIds: { has: clientId } },
          { clientIds: { equals: [] }, audience: "public" },
        ],
      },
      include: { liveSession: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    // Require shareToken match on at least one live/meeting belonging to same company
    const tokenOk = await prisma.liveSession.findFirst({
      where: { shareToken },
      select: { companyId: true },
    }) || await prisma.meeting.findFirst({
      where: { shareToken },
      select: { companyId: true },
    });
    if (!tokenOk) return { error: "Lien client invalide." as const };
    const filtered = posts.filter((p) => p.companyId === tokenOk.companyId);
    return { posts: filtered.map(mapPost), shareToken };
  }

  const companyId = live?.companyId ?? meeting!.companyId;
  const posts = await prisma.feedPost.findMany({
    where: {
      companyId,
      audience: { in: ["clients", "public"] },
      OR: [{ clientIds: { has: clientId } }, { clientIds: { equals: [] } }],
    },
    include: { liveSession: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return {
    posts: posts.map(mapPost),
    live: live ? mapLive(live) : null,
    meetingId: meeting?.id,
    shareToken,
  };
}

export async function createFeedPost(input: {
  companyId: string;
  authorId?: string;
  authorName: string;
  body: string;
  audience: FeedAudience;
  role: Role;
  startLive?: boolean;
  visibilityRoles?: string[];
  clientIds?: string[];
  meetingId?: string;
}) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  if (!canApp(input.role, "posts:write")) {
    return { error: "Permission publication refusée." as const };
  }
  const body = input.body.trim();
  if (!body) return { error: "Message requis." as const };

  let liveSessionId: string | undefined;
  let simulated = false;

  if (input.startLive) {
    if (!canApp(input.role, "live:host")) {
      return { error: "Permission live refusée." as const };
    }
    const room = await createDailyRoom({
      nameHint: body.slice(0, 40),
      enableRecording: true,
    });
    if ("error" in room) return { error: room.error };
    simulated = !!room.simulated;

    const base = slugBase(body.slice(0, 40));
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const taken = await prisma.liveSession.findFirst({
        where: { companyId: input.companyId, slug },
        select: { id: true },
      });
      if (!taken) break;
      slug = `${base}-${randomBytes(2).toString("hex")}`;
    }

    const live = await prisma.liveSession.create({
      data: {
        companyId: input.companyId,
        meetingId: input.meetingId,
        title: body.slice(0, 80),
        dailyRoomName: room.name,
        dailyRoomUrl: room.url,
        status: "live",
        audience: input.audience,
        slug,
        startedAt: new Date(),
        clientIds: input.clientIds ?? [],
      },
    });
    liveSessionId = live.id;
  }

  const post = await prisma.feedPost.create({
    data: {
      companyId: input.companyId,
      authorId: input.authorId,
      authorName: input.authorName,
      body,
      audience: input.audience,
      liveSessionId,
      visibilityRoles: input.visibilityRoles ?? [],
      clientIds: input.clientIds ?? [],
    },
    include: { liveSession: true },
  });

  return { post: mapPost(post), simulated };
}

export async function startLiveSession(input: {
  companyId: string;
  role: Role;
  title?: string;
  audience: FeedAudience;
  meetingId?: string;
  clientIds?: string[];
}) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  if (!canApp(input.role, "live:host")) {
    return { error: "Permission live refusée." as const };
  }

  const room = await createDailyRoom({
    nameHint: input.title || "live",
    enableRecording: true,
  });
  if ("error" in room) return { error: room.error };

  const base = slugBase(input.title || "live");
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.liveSession.findFirst({
      where: { companyId: input.companyId, slug },
      select: { id: true },
    });
    if (!taken) break;
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }

  const live = await prisma.liveSession.create({
    data: {
      companyId: input.companyId,
      meetingId: input.meetingId,
      title: input.title,
      dailyRoomName: room.name,
      dailyRoomUrl: room.url,
      status: "live",
      audience: input.audience,
      slug,
      startedAt: new Date(),
      clientIds: input.clientIds ?? [],
    },
  });

  return { live: mapLive(live), simulated: room.simulated };
}

export async function stopLiveSession(
  companyId: string,
  liveId: string,
  role: Role,
  recordingUrl?: string
) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  if (!canApp(role, "live:host")) {
    return { error: "Permission live refusée." as const };
  }
  const existing = await prisma.liveSession.findFirst({
    where: { id: liveId, companyId },
  });
  if (!existing) return { error: "Live introuvable." as const };

  const live = await prisma.liveSession.update({
    where: { id: liveId },
    data: {
      status: "ended",
      endedAt: new Date(),
      ...(recordingUrl ? { recordingUrl } : {}),
    },
  });

  if (recordingUrl) {
    await prisma.feedPost.updateMany({
      where: { liveSessionId: liveId },
      data: { recordingUrl },
    });
  }

  return { live: mapLive(live) };
}

export async function getLiveBySlug(slug: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.liveSession.findFirst({ where: { slug } });
  return row ? mapLive(row) : null;
}

export async function getLiveByShareToken(shareToken: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.liveSession.findFirst({ where: { shareToken } });
  return row ? mapLive(row) : null;
}

export async function issueLiveJoinToken(input: {
  liveId?: string;
  slug?: string;
  shareToken?: string;
  userName: string;
  userId?: string;
  isHost?: boolean;
  asPublic?: boolean;
  asClient?: boolean;
  role?: Role;
  companyId?: string;
}) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };

  const row = input.shareToken
    ? await prisma.liveSession.findFirst({ where: { shareToken: input.shareToken } })
    : input.slug
      ? await prisma.liveSession.findFirst({ where: { slug: input.slug } })
      : input.companyId && input.liveId
        ? await prisma.liveSession.findFirst({
            where: { id: input.liveId, companyId: input.companyId },
          })
        : input.liveId
          ? await prisma.liveSession.findFirst({ where: { id: input.liveId } })
          : null;

  if (!row) return { error: "Live introuvable." as const };

  if (input.asPublic && row.audience !== "public") {
    return { error: "Ce live n'est pas public." as const };
  }
  if (input.asClient && row.audience !== "clients" && row.audience !== "public") {
    return { error: "Accès client non autorisé." as const };
  }
  if (!input.asPublic && !input.asClient && input.role) {
    if (!canApp(input.role, "meetings:join") && !canApp(input.role, "live:host")) {
      return { error: "Permission refusée." as const };
    }
  }

  const isOwner =
    !!input.isHost && !!input.role && canApp(input.role, "live:host");
  const viewerOnly = !!(input.asPublic || input.asClient) && !isOwner;

  const tokenRes = await createMeetingToken({
    roomName: row.dailyRoomName,
    userName: input.userName,
    userId: input.userId,
    isOwner,
    viewerOnly,
  });
  if ("error" in tokenRes) return { error: tokenRes.error };

  return {
    token: tokenRes.token,
    roomUrl: row.dailyRoomUrl,
    live: mapLive(row),
    simulated: tokenRes.simulated,
  };
}
