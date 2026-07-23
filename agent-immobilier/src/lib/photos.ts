/** Fallbacks when profile photos are missing from /public */
export const PORTRAIT_HERO =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80";
export const PORTRAIT_CAREER =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=80";

/** Local portrait paths that were referenced in DB but never shipped in this deploy */
const MISSING_LOCAL_PORTRAITS = new Set([
  "/images/leonne-portrait-cream.png",
  "/images/leonne-portrait-navy.png",
  "/images/leonne-portrait.png",
]);

/**
 * Resolve a usable photo URL for next/image.
 * Avoids broken local paths that 404 and blank the hero.
 */
export function resolvePublicPhotoUrl(
  photoUrl: string | null | undefined,
  fallback: string = PORTRAIT_HERO
): string {
  if (!photoUrl?.trim()) return fallback;
  const url = photoUrl.trim();

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    if (MISSING_LOCAL_PORTRAITS.has(url)) return fallback;
    return url;
  }

  return fallback;
}
