import { getAdminSecret } from "@/lib/admin-session";
import { siteUrl } from "@/lib/utils";

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(message: string): Promise<string> {
  const secret = getAdminSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`media:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig).slice(0, 32);
}

/** Signed media URL (1 year). Used at upload time. */
export async function signMediaUrl(key: string, ttlSec = 60 * 60 * 24 * 365) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = await hmacHex(`${key}:${exp}`);
  return `/api/media/${encodeURIComponent(key)}?exp=${exp}&sig=${sig}`;
}

export async function verifyMediaSignature(
  key: string,
  expRaw: string | null,
  sigRaw: string | null
): Promise<boolean> {
  if (!expRaw || !sigRaw) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  if (!/^[a-f0-9]{16,64}$/i.test(sigRaw)) return false;
  const expected = await hmacHex(`${key}:${exp}`);
  if (expected.length !== sigRaw.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sigRaw.charCodeAt(i);
  }
  return diff === 0;
}

function ourHosts(): Set<string> {
  const hosts = new Set<string>();
  try {
    hosts.add(new URL(siteUrl()).host);
  } catch {
    /* ignore */
  }
  hosts.add("leonnebienaime.ca");
  hosts.add("www.leonnebienaime.ca");
  hosts.add("leonnebienaime.pipoxdavensonazor.workers.dev");
  hosts.add("localhost:3000");
  return hosts;
}

/**
 * Allow media if:
 * - valid ?exp=&sig=, or
 * - embedded by our site (Sec-Fetch-Dest image/video + not cross-site), or
 * - admin session (caller checks separately)
 *
 * Blocks hotlinking from other websites.
 */
export function isAllowedMediaEmbed(req: Request): boolean {
  const site = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  const dest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();

  if (site === "cross-site") return false;

  const embedDest = dest === "image" || dest === "video" || dest === "audio";
  if (embedDest && (site === "same-origin" || site === "same-site")) {
    return true;
  }

  // Some browsers omit Sec-Fetch on images — fall back to Referer host
  const referer = req.headers.get("referer");
  if (referer && embedDest) {
    try {
      const host = new URL(referer).host;
      if (ourHosts().has(host)) return true;
    } catch {
      /* ignore */
    }
  }

  return false;
}
