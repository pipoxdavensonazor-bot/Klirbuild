interface CloudflareEnv {
  DB: D1Database;
  MEDIA?: KVNamespace;
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET?: string;
}
