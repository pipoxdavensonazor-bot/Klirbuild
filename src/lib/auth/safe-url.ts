const RELATIVE_MEDIA_BASE = "https://klirline.invalid";

/** Reconstruit une URL http(s) absolue ; jamais la chaîne brute. */
export function toSafeHttpUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Allow only http(s) absolute URLs for user-supplied links (ads, etc.). */
export function isSafeHttpUrl(raw: string): boolean {
  return toSafeHttpUrl(raw) !== null;
}

/**
 * Reconstruit une URL affichable en <img src> : http(s) absolu, ou chemin
 * same-origin (`/…`, pas `//`). Retourne toujours une valeur reconstruite
 * via `new URL()`, jamais l’entrée brute.
 */
export function toSafeMediaSrc(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    if (
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\") &&
      !value.includes(":")
    ) {
      const url = new URL(value, RELATIVE_MEDIA_BASE);
      if (url.protocol !== "https:") return null;
      if (url.origin !== "https://klirline.invalid") return null;
      return `${url.pathname}${url.search}${url.hash}`;
    }
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** URL affichable en <img src> : http(s) ou chemin relatif d’origine (`/…`, pas `//`). */
export function isSafeMediaUrl(raw: string): boolean {
  return toSafeMediaSrc(raw) !== null;
}
