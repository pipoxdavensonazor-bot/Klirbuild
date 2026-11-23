/**
 * Tutoriels vidéo du centre d'aide — fichiers servis depuis le bucket R2 `klirbuild-help-videos`
 * (binding HELP_VIDEOS) sur la même origine que l'app : /help-videos/<clé>.
 * Gère Range (206) pour Safari / iOS et la lecture par morceaux.
 */

export const HELP_MEDIA_PREFIX = "/help-videos/";

const KEY_RE = /^[a-z0-9][a-z0-9-]*(\.fr)?\.(mp4|vtt|jpg|webp)$/;

/** Sous-ensemble de l'API R2 utilisé ici (facilite les tests). */
export type HelpMediaObject = {
  size: number;
  httpEtag: string;
  range?: { offset?: number; length?: number; suffix?: number };
  writeHttpMetadata(headers: Headers): void;
  body?: ReadableStream | null;
};

export type HelpMediaBucket = {
  get(
    key: string,
    options?: { range?: Headers; onlyIf?: Headers }
  ): Promise<HelpMediaObject | null>;
};

const CONTENT_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  vtt: "text/vtt; charset=utf-8",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export function helpMediaKey(pathname: string): string | null {
  if (!pathname.startsWith(HELP_MEDIA_PREFIX)) return null;
  const key = pathname.slice(HELP_MEDIA_PREFIX.length);
  return KEY_RE.test(key) ? key : null;
}

/**
 * Retourne une réponse pour /help-videos/*, ou null si la requête ne concerne pas ce chemin
 * (le Worker passe alors la main à Next).
 */
export async function serveHelpMedia(
  request: Request,
  bucket: HelpMediaBucket | undefined
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(HELP_MEDIA_PREFIX)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
  }
  const key = helpMediaKey(url.pathname);
  if (!key || !bucket) return new Response("Not found", { status: 404 });

  const obj = await bucket.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", CONTENT_TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream");
  }
  headers.set("etag", obj.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=86400");
  headers.set("x-content-type-options", "nosniff");

  // onlyIf non satisfait (If-None-Match…) : R2 renvoie l'objet sans body
  if (!("body" in obj) || obj.body === undefined) {
    return new Response(null, { status: 304, headers });
  }

  const head = request.method === "HEAD";
  const r = obj.range;
  if (request.headers.has("range") && r) {
    const offset = r.suffix != null ? Math.max(obj.size - r.suffix, 0) : r.offset ?? 0;
    const length = r.length ?? obj.size - offset;
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("content-length", String(length));
    return new Response(head ? null : obj.body ?? null, { status: 206, headers });
  }

  headers.set("content-length", String(obj.size));
  return new Response(head ? null : obj.body ?? null, { status: 200, headers });
}
