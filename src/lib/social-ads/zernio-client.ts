const ZERNIO_BASE =
  process.env.ZERNIO_API_BASE_URL?.replace(/\/$/, "") ?? "https://zernio.com/api/v1";

export function hasZernioApiKey() {
  return Boolean(process.env.ZERNIO_API_KEY?.trim());
}

type ZernioRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
};

export class ZernioApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function zernioFetch<T>(path: string, options: ZernioRequestOptions = {}): Promise<T> {
  const key = process.env.ZERNIO_API_KEY?.trim();
  if (!key) throw new ZernioApiError("ZERNIO_API_KEY manquant.", 503);

  const url = new URL(`${ZERNIO_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Erreur Zernio (${res.status})`;
    throw new ZernioApiError(msg, res.status);
  }

  return data as T;
}

export type ZernioProfile = { _id: string; name: string };
export type ZernioAccount = {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profileId?: string;
  followersCount?: number;
  status?: string;
};

export type ZernioPost = {
  _id: string;
  content?: string;
  status?: string;
  scheduledFor?: string;
  platforms?: Array<{ platform: string; accountId: string; status?: string }>;
};

export async function zernioCreateProfile(name: string, description?: string) {
  const data = await zernioFetch<{ profile: ZernioProfile }>("/profiles", {
    method: "POST",
    body: { name, description },
  });
  return data.profile;
}

export async function zernioGetConnectUrl(platform: string, profileId: string) {
  const data = await zernioFetch<{ authUrl: string }>(`/connect/${platform}`, {
    query: { profileId },
  });
  return data.authUrl;
}

export async function zernioListAccounts() {
  const data = await zernioFetch<{ accounts: ZernioAccount[] }>("/accounts");
  return data.accounts ?? [];
}

export async function zernioCreatePost(body: {
  content: string;
  platforms: Array<{ platform: string; accountId: string }>;
  publishNow?: boolean;
  scheduledFor?: string;
  timezone?: string;
  queuedFromProfile?: string;
  queueId?: string;
  mediaItems?: Array<{ url: string; type?: string }>;
}) {
  const data = await zernioFetch<{ post: ZernioPost }>("/posts", {
    method: "POST",
    body,
  });
  return data.post;
}

export async function zernioListPosts(limit = 20) {
  const data = await zernioFetch<{ posts: ZernioPost[] }>("/posts", {
    query: { limit: String(limit) },
  });
  return data.posts ?? [];
}

export async function zernioNextQueueSlot(profileId: string, queueId?: string) {
  const data = await zernioFetch<{ slot?: string; nextSlot?: string }>("/queue/next-slot", {
    query: { profileId, queueId },
  });
  return data.slot ?? data.nextSlot ?? null;
}

export async function zernioGetAnalytics(limit = 10) {
  const data = await zernioFetch<{
    analytics?: Array<{
      platform?: string;
      engagement?: number;
      impressions?: number;
      bestHour?: number;
    }>;
    posts?: Array<{ platform?: string; engagement?: number }>;
  }>("/analytics", {
    query: { sortBy: "engagement", limit: String(limit) },
  });
  return data;
}
