/**
 * Client-safe relative-path sanitizer for post-login redirects.
 * Blocks open redirects like //evil.com or https://evil.com.
 */
export function sanitizeNextPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  const value = (next || fallback).trim() || fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("\0")) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;
  return value;
}

/** @deprecated alias — prefer sanitizeNextPath */
export const sanitizeOAuthNext = sanitizeNextPath;
