import { randomBytes } from "crypto";
import { hasDatabase } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { canApp, type AppPermission } from "@/lib/workforce/types";
import type { Role } from "@/types";
import {
  createDailyRoom,
  createMeetingToken,
  type DailyAudience,
} from "@/lib/meetings/daily-service";

export type MeetingAudience = DailyAudience;
export type MeetingStatus = "scheduled" | "live" | "ended";

function slugBase(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "reunion"
  );
}

export function mapMeeting(row: {
  id: string;
  companyId: string;
  title: string;
  audience: string;
  slug: string;
  dailyRoomName: string;
  dailyRoomUrl: string;
  status: string;
  hostUserId: string | null;
  hostName: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  allowedRoles: string[];
  clientIds: string[];
  shareToken: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    title: row.title,
    audience: row.audience as MeetingAudience,
    slug: row.slug,
    dailyRoomName: row.dailyRoomName,
    dailyRoomUrl: row.dailyRoomUrl,
    status: row.status as MeetingStatus,
    hostUserId: row.hostUserId ?? undefined,
    hostName: row.hostName ?? undefined,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    allowedRoles: row.allowedRoles,
    clientIds: row.clientIds,
    shareToken: row.shareToken,
    createdAt: row.createdAt.toISOString(),
    publicPath: `/live/${row.slug}`,
    clientPath: `/client-live/${row.shareToken}`,
  };
}

export async function listMeetings(companyId: string) {
  if (!hasDatabase()) return [];
  const rows = await prisma.meeting.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(mapMeeting);
}

export async function getMeeting(companyId: string, id: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.meeting.findFirst({ where: { id, companyId } });
  return row ? mapMeeting(row) : null;
}

export async function getMeetingBySlug(slug: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.meeting.findFirst({ where: { slug } });
  return row ? mapMeeting(row) : null;
}

export async function getMeetingByShareToken(shareToken: string) {
  if (!hasDatabase()) return null;
  const row = await prisma.meeting.findFirst({ where: { shareToken } });
  return row ? mapMeeting(row) : null;
}

export function canJoinMeeting(
  role: Role,
  meeting: { allowedRoles: string[]; audience: string },
  opts?: { asClient?: boolean; asPublic?: boolean }
) {
  if (opts?.asPublic && meeting.audience === "public") return true;
  if (opts?.asClient && meeting.audience === "clients") return true;
  if (!canApp(role, "meetings:join")) return false;
  if (meeting.allowedRoles.length === 0) return true;
  return meeting.allowedRoles.includes(role);
}

export function canHostMeeting(role: Role) {
  return canApp(role, "meetings:host");
}

export async function createMeeting(input: {
  companyId: string;
  title: string;
  audience: MeetingAudience;
  hostUserId?: string;
  hostName?: string;
  startsAt?: Date | null;
  allowedRoles?: string[];
  clientIds?: string[];
}) {
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis." as const };
  }
  const title = input.title.trim();
  if (!title) return { error: "Titre requis." as const };

  const room = await createDailyRoom({
    nameHint: title,
    enableRecording: true,
  });
  if ("error" in room) return { error: room.error };

  const base = slugBase(title);
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const taken = await prisma.meeting.findFirst({
      where: { companyId: input.companyId, slug },
      select: { id: true },
    });
    if (!taken) break;
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }

  const row = await prisma.meeting.create({
    data: {
      companyId: input.companyId,
      title,
      audience: input.audience,
      slug,
      dailyRoomName: room.name,
      dailyRoomUrl: room.url,
      status: "scheduled",
      hostUserId: input.hostUserId,
      hostName: input.hostName,
      startsAt: input.startsAt ?? new Date(),
      allowedRoles: input.allowedRoles ?? [],
      clientIds: input.clientIds ?? [],
    },
  });

  return {
    meeting: mapMeeting(row),
    simulated: "simulated" in room ? room.simulated : false,
  };
}

export async function updateMeetingStatus(
  companyId: string,
  id: string,
  status: MeetingStatus
) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };
  const existing = await prisma.meeting.findFirst({ where: { id, companyId } });
  if (!existing) return { error: "Réunion introuvable." as const };

  const row = await prisma.meeting.update({
    where: { id },
    data: {
      status,
      ...(status === "live" ? { startsAt: existing.startsAt ?? new Date() } : {}),
      ...(status === "ended" ? { endsAt: new Date() } : {}),
    },
  });
  return { meeting: mapMeeting(row) };
}

export async function issueMeetingJoinToken(input: {
  meetingId: string;
  companyId?: string;
  userName: string;
  userId?: string;
  role?: Role;
  isHost?: boolean;
  asPublic?: boolean;
  asClient?: boolean;
  shareToken?: string;
}) {
  if (!hasDatabase()) return { error: "DATABASE_URL requis." as const };

  const row = input.shareToken
    ? await prisma.meeting.findFirst({ where: { shareToken: input.shareToken } })
    : input.companyId
      ? await prisma.meeting.findFirst({
          where: { id: input.meetingId, companyId: input.companyId },
        })
      : await prisma.meeting.findFirst({ where: { id: input.meetingId } });

  if (!row) return { error: "Réunion introuvable." as const };

  if (input.asPublic) {
    if (row.audience !== "public") {
      return { error: "Cette réunion n'est pas publique." as const };
    }
  } else if (input.asClient) {
    if (row.audience !== "clients" && row.audience !== "public") {
      return { error: "Accès client non autorisé." as const };
    }
  } else if (input.role) {
    if (!canJoinMeeting(input.role, row)) {
      return { error: "Permission refusée." as const };
    }
  } else {
    return { error: "Authentification requise." as const };
  }

  const isOwner = !!input.isHost && !!input.role && canHostMeeting(input.role);
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
    roomName: row.dailyRoomName,
    meeting: mapMeeting(row),
    simulated: tokenRes.simulated,
  };
}

/** Permission used by RequirePermission wrappers */
export const MEETINGS_JOIN_PERM: AppPermission = "meetings:join";
export const MEETINGS_HOST_PERM: AppPermission = "meetings:host";
