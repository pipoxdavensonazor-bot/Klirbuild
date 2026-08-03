/**
 * Prevent open redirects: Stripe success/cancel URLs must stay on allowlisted origins.
 */
export function getAllowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ??
    "https://klirline-store.pages.dev,https://store.klirline.com,https://klirline.com,https://www.klirline.com,http://localhost:5173,http://localhost:4173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Returns the URL if its origin is allowlisted; otherwise null.
 * Rejects javascript:, data:, and non-http(s) schemes.
 */
export function assertSafeReturnUrl(
  raw: string | undefined | null,
  allowedOrigins: string[] = getAllowedOrigins(),
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  // Production origins must be https (localhost may use http).
  const isLocal =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname.endsWith(".local");
  if (!isLocal && parsed.protocol !== "https:") return null;
  if (!allowedOrigins.includes(parsed.origin)) return null;
  return parsed.toString();
}
