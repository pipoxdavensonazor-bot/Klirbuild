import { getStore } from "@netlify/blobs";

const STORE = "klirline-uploads";

export function uploadsEnabled() {
  return Boolean(
    process.env.NETLIFY === "true" ||
      process.env.NETLIFY_SITE_ID ||
      process.env.CONTEXT
  );
}

export async function putUpload(
  key: string,
  data: ArrayBuffer | Blob | string,
  contentType: string
) {
  const store = getStore({ name: STORE, consistency: "strong" });
  await store.set(key, data, { metadata: { contentType } });
  return key;
}

export async function getUpload(key: string) {
  const store = getStore({ name: STORE, consistency: "strong" });
  return store.get(key, { type: "arrayBuffer" });
}

export async function getUploadMetadata(key: string) {
  const store = getStore({ name: STORE, consistency: "strong" });
  const meta = await store.getMetadata(key);
  return meta?.metadata as { contentType?: string } | undefined;
}

export function publicUploadUrl(key: string, baseUrl: string) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/$/, "")}/api/uploads/${path}`;
}
