/**
 * In-memory rate limiter (per isolate). Prefer CF-Connecting-IP over spoofable XFF.
 */
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(input.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return { ok: true };
  }
  if (existing.count >= input.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
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
export function rateLimitResponse(
  request: Request,
  scope: string,
  opts?: { limit?: number; windowMs?: number }
): NextResponse | null {
  const limit = opts?.limit ?? 20;
  const windowMs = opts?.windowMs ?? 15 * 60 * 1000;
  const ip = clientIp(request);
  const result = rateLimit({ key: `${scope}:${ip}`, limit, windowMs });
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
