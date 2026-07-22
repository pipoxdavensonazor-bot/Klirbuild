/* Augment wrangler-generated CloudflareEnv with secrets + optional Hyperdrive. */

interface CloudflareEnv {
  HYPERDRIVE?: Hyperdrive;
  CRON_SECRET?: string;
  DATABASE_URL?: string;
}

declare namespace Cloudflare {
  interface Env {
    HYPERDRIVE?: Hyperdrive;
    CRON_SECRET?: string;
    DATABASE_URL?: string;
  }
}
