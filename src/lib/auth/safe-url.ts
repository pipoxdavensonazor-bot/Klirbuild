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
