/**
 * Minimal Cloudflare binding shapes for Next.js server code.
 * Full Worker runtime types live in types/cloudflare-env.d.ts (excluded from Next tsc).
 */
export type KlirR2Object = {
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
};

export type KlirR2Bucket = {
  put(
    key: string,
    value: ArrayBuffer | string | ReadableStream | Blob | null,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    }
  ): Promise<unknown>;
  get(key: string): Promise<KlirR2Object | null>;
  head(key: string): Promise<KlirR2Object | null>;
};

export type KlirCloudflareEnv = {
  UPLOADS_BUCKET?: KlirR2Bucket;
  BACKUPS_BUCKET?: KlirR2Bucket;
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  CRON_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
  UPLOADS_R2_ENABLED?: string;
};
