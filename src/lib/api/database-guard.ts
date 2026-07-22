import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { KlirCloudflareEnv } from "@/lib/cloudflare-bindings";

export const DATABASE_REQUIRED_MESSAGE =
  "DATABASE_URL requis. Configurez Postgres (Hyperdrive / DATABASE_URL) sur Cloudflare." as const;

export function hasDatabaseUrl() {
  if (
    process.env.DATABASE_URL?.trim() ||
    process.env.NETLIFY_DB_URL?.trim()
  ) {
    return true;
  }
  try {
    const { env } = getCloudflareContext();
    const cf = env as KlirCloudflareEnv;
    return Boolean(cf.HYPERDRIVE?.connectionString || cf.DATABASE_URL?.trim());
  } catch {
    return false;
  }
}

/** Routes API accessibles sans Postgres (auth, stripe, santé, cron). */
export const API_DB_WHITELIST = [
  "/api/health",
  "/api/auth",
  "/api/stripe",
  "/api/cron",
  "/api/uploads",
] as const;

export function apiRequiresDatabase(pathname: string) {
  if (!pathname.startsWith("/api/")) return false;
  return !API_DB_WHITELIST.some((prefix) => pathname.startsWith(prefix));
}

export function databaseRequiredResponse() {
  return NextResponse.json({ error: DATABASE_REQUIRED_MESSAGE }, { status: 503 });
}
