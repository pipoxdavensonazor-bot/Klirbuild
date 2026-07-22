import { getBackupsKv, getUploadsKv } from "@/lib/storage/kv";

/**
 * Uploads enabled when Workers KV UPLOADS_KV is bound,
 * or UPLOADS_KV_ENABLED=true (local / wrangler vars).
 */
export function uploadsEnabled() {
  if (process.env.UPLOADS_KV_ENABLED === "true") return true;
  if (process.env.UPLOADS_KV_ENABLED === "false") return false;
  // Legacy alias from earlier R2 migration
  if (process.env.UPLOADS_R2_ENABLED === "true") return true;
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
  const kv = await getUploadsKv();
  if (!kv) {
    throw new Error("UPLOADS_KV binding unavailable");
  }

  let body: ArrayBuffer | string = data as ArrayBuffer | string;
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    body = await data.arrayBuffer();
  }

  await kv.put(key, body, {
    metadata: { contentType },
  });
  return key;
}

export async function getUpload(key: string) {
  const kv = await getUploadsKv();
  if (!kv) return null;
  const value = await kv.get(key, { type: "arrayBuffer" });
  return (value as ArrayBuffer | null) ?? null;
}

export async function getUploadMetadata(key: string) {
  const kv = await getUploadsKv();
  if (!kv) return undefined;
  const result = await kv.getWithMetadata(key, { type: "arrayBuffer" });
  const contentType = result.metadata?.contentType;
  return typeof contentType === "string" ? { contentType } : undefined;
}

export function publicUploadUrl(key: string, baseUrl: string) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/$/, "")}/api/uploads/${path}`;
}

/** @deprecated Prefer getBackupsKv from kv.ts */
export async function getBackupObject(key: string) {
  const kv = await getBackupsKv();
  if (!kv) return null;
  return kv.get(key, { type: "text" });
}
