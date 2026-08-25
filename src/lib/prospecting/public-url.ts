const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

const PRIVATE_IPV4 =
  /^(127\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|0\.0\.0\.0)$/;

function isPrivateIpv4(host: string): boolean {
  if (PRIVATE_IPV4.test(host)) return true;
  const m = /^172\.(\d{1,3})\./.exec(host);
  if (!m) return false;
  const second = Number(m[1]);
  return second >= 16 && second <= 31;
}

export function hostnameOf(url: URL): string {
  return url.hostname.replace(/\.$/, "").toLowerCase();
}

/** Refuse les URL internes / non HTTP — protection SSRF avant fetch d'un site entreprise. */
export function parsePublicHttpUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const host = hostnameOf(url);
  if (!host || host === "0" || BLOCKED_HOSTS.has(host)) return null;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return null;
  }
  if (host.includes(":") || isPrivateIpv4(host)) return null;
  if (host === "::1" || host.startsWith("[") || host.endsWith(".arpa")) return null;
  return url;
}

export function originKey(url: URL): string {
  return hostnameOf(url).replace(/^www\./, "");
}
