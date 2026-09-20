const TRACKING_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "gclid",
  "fbclid",
  "msclkid",
  "lang",
]);

export function pickTrackingParams(
  params: URLSearchParams | Record<string, string | string[] | undefined> | null | undefined
): URLSearchParams {
  const out = new URLSearchParams();
  if (!params) return out;

  const entries: Array<[string, string]> =
    params instanceof URLSearchParams
      ? [...params.entries()]
      : Object.entries(params).flatMap(([key, value]) => {
          if (typeof value === "string" && value) return [[key, value] as [string, string]];
          if (Array.isArray(value) && value[0]) return [[key, value[0]] as [string, string]];
          return [];
        });

  for (const [key, value] of entries) {
    const k = key.toLowerCase();
    if (TRACKING_KEYS.has(k) && value.trim()) out.set(k, value.trim());
  }
  return out;
}

export function withTrackingQuery(
  path: string,
  params: URLSearchParams | Record<string, string | string[] | undefined> | null | undefined,
  extra?: Record<string, string | undefined>
): string {
  const next = pickTrackingParams(params);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value?.trim()) next.set(key, value.trim());
      else next.delete(key);
    }
  }
  const qs = next.toString();
  const base = path.split("?")[0] ?? path;
  return qs ? `${base}?${qs}` : base;
}

export function trackingSummary(params: URLSearchParams): string {
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
  ];
  const parts = keys
    .map((key) => {
      const value = params.get(key);
      return value ? `${key}=${value}` : null;
    })
    .filter(Boolean);
  return parts.join(" · ");
}
