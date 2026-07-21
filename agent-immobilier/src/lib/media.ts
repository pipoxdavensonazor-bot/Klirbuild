import { getCloudflareContext } from "@opennextjs/cloudflare";

export type MediaMeta = {
  contentType: string;
  fileName?: string;
  size?: number;
  source?: "upload" | "drive";
};

type KvLike = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string,
    options?: { metadata?: MediaMeta; expirationTtl?: number }
  ) => Promise<void>;
  getWithMetadata: (
    key: string,
    type: "arrayBuffer"
  ) => Promise<{ value: ArrayBuffer | null; metadata: MediaMeta | null }>;
};

function getMediaKv(): KvLike | null {
  try {
    const { env } = getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((env as any)?.MEDIA as KvLike) || null;
  } catch {
    return null;
  }
}

export function mediaPublicPath(key: string) {
  return `/api/media/${encodeURIComponent(key)}`;
}

export async function saveMediaObject(opts: {
  bytes: ArrayBuffer | Uint8Array;
  contentType: string;
  fileName?: string;
  source?: "upload" | "drive";
  key?: string;
}) {
  const kv = getMediaKv();
  if (!kv) {
    throw new Error(
      "Stockage MEDIA indisponible. Vérifiez le binding KV dans wrangler.jsonc."
    );
  }

  const key =
    opts.key ||
    `media_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  const body =
    opts.bytes instanceof Uint8Array
      ? opts.bytes
      : new Uint8Array(opts.bytes);

  const meta: MediaMeta = {
    contentType: opts.contentType || "application/octet-stream",
    fileName: opts.fileName,
    size: body.byteLength,
    source: opts.source || "upload",
  };

  await kv.put(key, body, {
    metadata: meta,
  });

  return { key, url: mediaPublicPath(key), meta };
}

export async function readMediaObject(key: string) {
  const kv = getMediaKv();
  if (!kv) return null;
  const result = await kv.getWithMetadata(key, "arrayBuffer");
  if (!result.value) return null;
  return {
    bytes: result.value,
    meta: result.metadata || { contentType: "application/octet-stream" },
  };
}

export function extractGoogleDriveFileId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // https://drive.google.com/file/d/FILE_ID/view...
  let m = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m?.[1]) return m[1];

  // https://drive.google.com/open?id=FILE_ID
  m = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m?.[1]) return m[1];

  // bare id
  if (/^[a-zA-Z0-9_-]{20,}$/.test(raw)) return raw;

  return null;
}

export async function fetchGoogleDriveFile(fileId: string) {
  const urls = [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://lh3.googleusercontent.com/d/${fileId}=s2000`,
  ];

  let lastError = "Impossible de télécharger le fichier Drive";
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LeonneSiteBot/1.0; +https://leonnebienaime.ca)",
        },
      });
      if (!res.ok) {
        lastError = `Drive HTTP ${res.status}`;
        continue;
      }
      const contentType = res.headers.get("content-type") || "";
      // Google sometimes returns HTML interstitial
      if (contentType.includes("text/html")) {
        lastError =
          "Le fichier Drive n'est pas public. Partagez-le en « Toute personne disposant du lien ».";
        continue;
      }
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 100) {
        lastError = "Fichier Drive vide ou inaccessible";
        continue;
      }
      const normalizedType = contentType.split(";")[0].trim().toLowerCase();
      const safeType =
        normalizedType.startsWith("image/") ||
        normalizedType.startsWith("video/")
          ? normalizedType
          : "application/octet-stream";
      return {
        bytes,
        contentType: safeType,
        fileName: `drive-${fileId}`,
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }
  throw new Error(lastError);
}

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
  "video/x-m4v",
]);

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 Mo
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 Mo (limite KV ~25 Mo)
/** @deprecated use MAX_IMAGE_BYTES */
export const MAX_UPLOAD_BYTES = MAX_IMAGE_BYTES;

export function isAllowedMediaType(contentType: string) {
  return (
    ALLOWED_IMAGE_TYPES.has(contentType) || ALLOWED_VIDEO_TYPES.has(contentType)
  );
}

export function maxBytesForType(contentType: string) {
  return ALLOWED_VIDEO_TYPES.has(contentType)
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES;
}
