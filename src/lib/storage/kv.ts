import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { KlirCloudflareEnv, KlirKvNamespace } from "@/lib/cloudflare-bindings";

async function cloudflareEnv(): Promise<KlirCloudflareEnv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as KlirCloudflareEnv;
  } catch {
    return null;
  }
}

export async function getUploadsKv(): Promise<KlirKvNamespace | null> {
  const env = await cloudflareEnv();
  return env?.UPLOADS_KV ?? null;
}

export async function getBackupsKv(): Promise<KlirKvNamespace | null> {
  const env = await cloudflareEnv();
  return env?.BACKUPS_KV ?? null;
}

export async function hasUploadsKv(): Promise<boolean> {
  return Boolean(await getUploadsKv());
}
