/**
 * Daily.co REST client for native meetings + live rooms.
 * Docs: https://docs.daily.co/reference/rest-api
 */

export type DailyAudience = "company" | "clients" | "public";

export function isDailyConfigured() {
  return Boolean(process.env.DAILY_API_KEY?.trim());
}

export function dailyDomain() {
  return (
    process.env.NEXT_PUBLIC_DAILY_DOMAIN?.trim().replace(/\/$/, "") ||
    "klirbuild.daily.co"
  );
}

function apiKey() {
  return process.env.DAILY_API_KEY?.trim() || "";
}

async function dailyFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const key = apiKey();
  if (!key) {
    return { ok: false, error: "DAILY_API_KEY manquant.", status: 503 };
  }
  try {
    const res = await fetch(`https://api.daily.co/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      error?: string;
      info?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        error:
          (typeof data.error === "string" && data.error) ||
          (typeof data.info === "string" && data.info) ||
          `Daily HTTP ${res.status}`,
        status: res.status,
      };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur Daily",
      status: 502,
    };
  }
}

function slugifyRoom(base: string) {
  const clean = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${clean || "room"}-${suffix}`;
}

export type CreatedDailyRoom = {
  name: string;
  url: string;
  simulated?: boolean;
};

/** Create a Daily room. Falls back to simulated URL when API key missing (dev). */
export async function createDailyRoom(input: {
  nameHint: string;
  enableRecording?: boolean;
}): Promise<CreatedDailyRoom | { error: string }> {
  const name = slugifyRoom(input.nameHint);
  const domain = dailyDomain();

  if (!isDailyConfigured()) {
    return {
      name,
      url: `https://${domain}/${name}`,
      simulated: true,
    };
  }

  const result = await dailyFetch<{ name: string; url: string }>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        enable_recording: input.enableRecording ? "cloud" : undefined,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      },
    }),
  });

  if (!result.ok) return { error: result.error };
  return { name: result.data.name, url: result.data.url };
}

export type MeetingTokenOpts = {
  roomName: string;
  userName: string;
  userId?: string;
  isOwner?: boolean;
  /** Viewer-only (no cam/mic send) for public / clients live */
  viewerOnly?: boolean;
  /** seconds */
  ttlSeconds?: number;
};

export async function createMeetingToken(
  opts: MeetingTokenOpts
): Promise<{ token: string; simulated?: boolean } | { error: string }> {
  const exp =
    Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 60 * 60 * 4);

  if (!isDailyConfigured()) {
    return {
      token: `sim_${Buffer.from(
        JSON.stringify({
          room: opts.roomName,
          n: opts.userName,
          o: !!opts.isOwner,
          v: !!opts.viewerOnly,
          exp,
        })
      ).toString("base64url")}`,
      simulated: true,
    };
  }

  const result = await dailyFetch<{ token: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: opts.roomName,
        user_name: opts.userName,
        user_id: opts.userId,
        is_owner: !!opts.isOwner,
        enable_screenshare: !opts.viewerOnly,
        start_video_off: !!opts.viewerOnly,
        start_audio_off: !!opts.viewerOnly,
        exp,
      },
    }),
  });

  if (!result.ok) return { error: result.error };
  return { token: result.data.token };
}

export function prebuiltUrl(roomUrl: string, token?: string) {
  if (!token) return roomUrl;
  const sep = roomUrl.includes("?") ? "&" : "?";
  return `${roomUrl}${sep}t=${encodeURIComponent(token)}`;
}
