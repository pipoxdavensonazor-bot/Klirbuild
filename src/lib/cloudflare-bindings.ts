/**
 * Minimal Cloudflare binding shapes for Next.js server code.
 * Full Worker runtime types live in types/cloudflare-env.d.ts (excluded from Next tsc).
 *
 * Storage uses Workers KV (no R2 subscription required).
 * KV value limit ≈ 25 MiB — app upload routes already cap at 5 Mo.
 */
export type KlirKvNamespace = {
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream | null,
    options?: {
      expirationTtl?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;
  get(
    key: string,
    options?: { type?: "arrayBuffer" | "text" | "json" | "stream" }
  ): Promise<ArrayBuffer | string | null>;
  getWithMetadata(
    key: string,
    options?: { type?: "arrayBuffer" | "text" | "json" | "stream" }
  ): Promise<{
    value: ArrayBuffer | string | null;
    metadata: Record<string, unknown> | null;
  }>;
  delete(key: string): Promise<void>;
};

export type KlirCloudflareEnv = {
  UPLOADS_KV?: KlirKvNamespace;
  BACKUPS_KV?: KlirKvNamespace;
  NEXT_INC_CACHE_KV?: KlirKvNamespace;
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  CRON_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
  UPLOADS_KV_ENABLED?: string;
};
