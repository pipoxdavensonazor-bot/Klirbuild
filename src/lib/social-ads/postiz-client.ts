/**
 * Postiz Public API — free when self-hosted.
 * Docs: https://docs.postiz.com/public-api/introduction
 *
 * Auth header is the raw API key (not Bearer).
 * Cloud: https://api.postiz.com/public/v1
 * Self-host: https://{domain}/api/public/v1  (or POSTIZ_API_BASE_URL)
 */

const DEFAULT_BASE = "https://api.postiz.com/public/v1";

export function hasPostizApiKey() {
  return Boolean(process.env.POSTIZ_API_KEY?.trim());
}

export function postizBaseUrl() {
  const raw =
    process.env.POSTIZ_API_BASE_URL?.trim() ||
    process.env.POSTIZ_URL?.trim() ||
    DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export class PostizApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type PostizRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
};

async function postizFetch<T>(
  path: string,
  options: PostizRequestOptions = {}
): Promise<T> {
  const key = process.env.POSTIZ_API_KEY?.trim();
  if (!key) throw new PostizApiError("POSTIZ_API_KEY manquant.", 503);

  const url = new URL(
    `${postizBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
  );
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      Authorization: key,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20_000),
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
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : typeof data === "object" &&
            data &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : `Erreur Postiz (${res.status})`;
    throw new PostizApiError(msg, res.status);
  }

  return data as T;
}

export type PostizIntegration = {
  id: string;
  name?: string;
  identifier?: string;
  picture?: string;
  disabled?: boolean;
  profile?: string;
  customer?: { id?: string; name?: string };
};

/** Map KlirBuild live platforms → Postiz integration identifiers */
export const TO_POSTIZ: Record<string, string> = {
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  youtube: "youtube",
  linkedin: "linkedin",
  threads: "threads",
  x: "x",
  twitter: "x",
};

export function fromPostizPlatform(identifier: string): string | null {
  const id = identifier.toLowerCase();
  if (id === "x" || id === "twitter") return "twitter";
  if (id === "instagram-standalone") return "instagram";
  if (id === "linkedin-page") return "linkedin";
  if (
    ["facebook", "instagram", "tiktok", "youtube", "linkedin", "threads"].includes(
      id
    )
  ) {
    return id;
  }
  return null;
}

export async function postizGetConnectUrl(integration: string) {
  const key = TO_POSTIZ[integration] ?? integration;
  const data = await postizFetch<{ url: string }>(`/social/${key}`);
  if (!data?.url) throw new PostizApiError("URL OAuth Postiz manquante.", 502);
  return data.url;
}

export async function postizListIntegrations() {
  const data = await postizFetch<PostizIntegration[] | { integrations: PostizIntegration[] }>(
    "/integrations"
  );
  if (Array.isArray(data)) return data;
  return data.integrations ?? [];
}

export async function postizCreatePost(body: {
  type: "now" | "schedule";
  date: string;
  shortLink?: boolean;
  tags?: unknown[];
  posts: Array<{
    integration: { id: string };
    value: Array<{ content: string; image?: unknown[] }>;
    settings: Record<string, unknown>;
  }>;
}) {
  return postizFetch<unknown>("/posts", {
    method: "POST",
    body: {
      shortLink: false,
      tags: [],
      ...body,
    },
  });
}
