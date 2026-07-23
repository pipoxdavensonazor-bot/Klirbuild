import { getUploadsKv } from "@/lib/storage/kv";
import { prisma } from "@/lib/db";
import { hasDatabase } from "@/lib/auth/auth-service";

export const LIVE_SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
] as const;

export type LiveSocialPlatform = (typeof LIVE_SOCIAL_PLATFORMS)[number];

export type LiveSocialDestination = {
  platform: LiveSocialPlatform;
  accountId?: string;
  accountName?: string;
  handle?: string;
  status: "connected" | "disconnected" | "needs_reauth";
  rtmpUrl?: string;
  hasStreamKey: boolean;
};

type RtmpStore = {
  rtmpUrl?: string;
  streamKey?: string;
  updatedAt: string;
};

function rtmpKey(companyId: string, platform: string) {
  return `live-rtmp:${companyId}:${platform}`;
}

const memoryRtmp = new Map<string, RtmpStore>();

export function isLiveSocialPlatform(v: string): v is LiveSocialPlatform {
  return (LIVE_SOCIAL_PLATFORMS as readonly string[]).includes(v);
}

export async function getRtmpDestination(
  companyId: string,
  platform: LiveSocialPlatform
): Promise<RtmpStore | null> {
  const kv = await getUploadsKv();
  if (kv) {
    const raw = await kv.get(rtmpKey(companyId, platform));
    if (!raw || typeof raw !== "string") return null;
    try {
      return JSON.parse(raw) as RtmpStore;
    } catch {
      return null;
    }
  }
  return memoryRtmp.get(rtmpKey(companyId, platform)) ?? null;
}

export async function saveRtmpDestination(
  companyId: string,
  platform: LiveSocialPlatform,
  input: { rtmpUrl?: string; streamKey?: string }
) {
  const prev = (await getRtmpDestination(companyId, platform)) ?? {
    updatedAt: new Date().toISOString(),
  };
  const next: RtmpStore = {
    rtmpUrl: input.rtmpUrl?.trim() || prev.rtmpUrl,
    streamKey:
      input.streamKey !== undefined
        ? input.streamKey.trim() || undefined
        : prev.streamKey,
    updatedAt: new Date().toISOString(),
  };
  const kv = await getUploadsKv();
  if (kv) {
    await kv.put(rtmpKey(companyId, platform), JSON.stringify(next), {
      expirationTtl: 60 * 60 * 24 * 365,
    });
  } else {
    memoryRtmp.set(rtmpKey(companyId, platform), next);
  }
  return next;
}

export async function listLiveSocialDestinations(
  companyId: string
): Promise<LiveSocialDestination[]> {
  const accounts = hasDatabase()
    ? await prisma.socialAccountConnection.findMany({
        where: {
          companyId,
          platform: { in: [...LIVE_SOCIAL_PLATFORMS] },
        },
      })
    : [];

  const byPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const out: LiveSocialDestination[] = [];
  for (const platform of LIVE_SOCIAL_PLATFORMS) {
    const row = byPlatform.get(platform);
    const rtmp = await getRtmpDestination(companyId, platform);
    const status =
      row?.status === "connected"
        ? "connected"
        : row?.status === "needs_reauth"
          ? "needs_reauth"
          : "disconnected";
    out.push({
      platform,
      accountId: row?.id,
      accountName: row?.accountName,
      handle: row?.handle,
      status,
      rtmpUrl: rtmp?.rtmpUrl,
      hasStreamKey: Boolean(rtmp?.streamKey),
    });
  }
  return out;
}

export function liveAnnounceMessage(input: {
  title: string;
  liveUrl: string;
  companyName?: string;
}) {
  const brand = input.companyName?.trim() || "KlirBuild";
  return `🔴 LIVE — ${input.title}\n\nRejoignez-nous en direct sur ${brand} :\n${input.liveUrl}`;
}
