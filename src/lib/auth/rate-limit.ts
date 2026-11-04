/**
 * Login/register/invite limits live in Workers KV (shared across isolates).
 * Memory is only a local-dev fallback when KV is not bound.
 */
import { NextResponse } from "next/server";
import { getBackupsKv } from "@/lib/storage/kv";

type Bucket = { count: number; resetAt: number };

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export type RateLimitStore = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
};

const memoryBuckets = new Map<string, Bucket>();

function bumpBucket(
  existing: Bucket | null,
  input: { limit: number; windowMs: number },
  now: number
): { bucket: Bucket; result: RateLimitResult } {
  if (!existing || existing.resetAt <= now) {
    return {
      bucket: { count: 1, resetAt: now + input.windowMs },
      result: { ok: true },
    };
  }
  if (existing.count >= input.limit) {
    return {
      bucket: existing,
      result: {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      },
    };
  }
  const bucket = { count: existing.count + 1, resetAt: existing.resetAt };
  return { bucket, result: { ok: true } };
}

export function rateLimitMemory(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = input.now ?? Date.now();
  const { bucket, result } = bumpBucket(memoryBuckets.get(input.key) ?? null, input, now);
  memoryBuckets.set(input.key, bucket);
  return result;
}

export async function rateLimitWithStore(
  store: RateLimitStore,
  input: { key: string; limit: number; windowMs: number; now?: number }
): Promise<RateLimitResult> {
  const now = input.now ?? Date.now();
  const storageKey = `rl:${input.key}`;
  const raw = await store.get(storageKey);
  let existing: Bucket | null = null;
  if (raw) {
    try {
      existing = JSON.parse(raw) as Bucket;
    } catch {
      existing = null;
    }
  }
  const { bucket, result } = bumpBucket(existing, input, now);
  const ttlSec = Math.max(60, Math.ceil((bucket.resetAt - now) / 1000));
  await store.put(storageKey, JSON.stringify(bucket), { expirationTtl: ttlSec });
  return result;
}

export async function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const kv = await getBackupsKv();
  if (kv) {
    return rateLimitWithStore(
      {
        get: async (key) => {
          const value = await kv.get(key, { type: "text" });
          return typeof value === "string" ? value : null;
        },
        put: (key, value, options) => kv.put(key, value, options),
      },
      input
    );
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, retryAfterSec: 60 };
  }
  return rateLimitMemory(input);
}

/** Prefer Cloudflare edge IP; never trust the first XFF hop alone. */
export function clientIp(request: Request) {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  // Last hop of XFF is typically the trusted proxy-added value.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1]!;
  }

  return "unknown";
}

/** Returns a 429 response when the bucket is exhausted; otherwise null. */
export async function rateLimitResponse(
  request: Request,
  scope: string,
  opts?: { limit?: number; windowMs?: number }
): Promise<NextResponse | null> {
  const limit = opts?.limit ?? 20;
  const windowMs = opts?.windowMs ?? 15 * 60 * 1000;
  const ip = clientIp(request);
  const result = await rateLimit({ key: `${scope}:${ip}`, limit, windowMs });
  if (result.ok) return null;
  return NextResponse.json(
    {
      error: `Trop de tentatives. Réessayez dans ${result.retryAfterSec}s.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    }
  );
}
