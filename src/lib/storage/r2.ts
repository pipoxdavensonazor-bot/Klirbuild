import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { KlirCloudflareEnv, KlirR2Bucket } from "@/lib/cloudflare-bindings";

async function cloudflareEnv(): Promise<KlirCloudflareEnv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as KlirCloudflareEnv;
  } catch {
    return null;
  }
}

export async function getUploadsBucket(): Promise<KlirR2Bucket | null> {
  const env = await cloudflareEnv();
  return env?.UPLOADS_BUCKET ?? null;
}

export async function getBackupsBucket(): Promise<KlirR2Bucket | null> {
  const env = await cloudflareEnv();
  return env?.BACKUPS_BUCKET ?? null;
}

export async function hasUploadsBucket(): Promise<boolean> {
  return Boolean(await getUploadsBucket());
}
