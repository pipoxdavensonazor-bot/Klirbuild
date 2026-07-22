import { getBackupsBucket, getUploadsBucket } from "@/lib/storage/r2";

/**
 * Uploads are enabled when the Worker has an R2 UPLOADS_BUCKET binding,
 * or when UPLOADS_R2_ENABLED=true (local preview / wrangler vars).
 */
export function uploadsEnabled() {
  if (process.env.UPLOADS_R2_ENABLED === "true") return true;
  if (process.env.UPLOADS_R2_ENABLED === "false") return false;
  // Cloudflare Workers / Pages markers (binding resolved at call time)
  return Boolean(
    process.env.CF_PAGES === "1" ||
      process.env.CLOUDFLARE_ENV ||
      process.env.WRANGLER_WORKER_NAME
  );
}

export async function putUpload(
  key: string,
  data: ArrayBuffer | Blob | string,
  contentType: string
) {
  const bucket = await getUploadsBucket();
  if (!bucket) {
    throw new Error("UPLOADS_BUCKET R2 binding unavailable");
  }

  let body: ArrayBuffer | string | ReadableStream | Blob = data;
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    body = await data.arrayBuffer();
  }

  await bucket.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: { contentType },
  });
  return key;
}

export async function getUpload(key: string) {
  const bucket = await getUploadsBucket();
  if (!bucket) return null;
  const obj = await bucket.get(key);
  if (!obj) return null;
  return obj.arrayBuffer();
}

export async function getUploadMetadata(key: string) {
  const bucket = await getUploadsBucket();
  if (!bucket) return undefined;
  const obj = await bucket.head(key);
  if (!obj) return undefined;
  const contentType =
    obj.customMetadata?.contentType || obj.httpMetadata?.contentType;
  return contentType ? { contentType } : undefined;
}

export function publicUploadUrl(key: string, baseUrl: string) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/$/, "")}/api/uploads/${path}`;
}

/** @deprecated Prefer getBackupsBucket from r2.ts — kept for any leftover imports. */
export async function getBackupObject(key: string) {
  const bucket = await getBackupsBucket();
  if (!bucket) return null;
  return bucket.get(key);
}
