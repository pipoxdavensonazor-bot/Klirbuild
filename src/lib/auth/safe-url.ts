/** Allow only http(s) absolute URLs for user-supplied links (ads, etc.). */
export function isSafeHttpUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** URL affichable en <img src> : http(s) ou chemin relatif d’origine (`/…`, pas `//`). */
export function isSafeMediaUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    return !value.includes(":");
  }
  return isSafeHttpUrl(value);
}
