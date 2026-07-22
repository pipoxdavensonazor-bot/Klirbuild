import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { cache } from "react";
import type { KlirCloudflareEnv } from "@/lib/cloudflare-bindings";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveEnvDatabaseUrl() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.NETLIFY_DB_URL?.trim() ||
    undefined
  );
}

function isCloudflareWorkerRuntime() {
  // Secrets/vars are injected into process.env on Workers; native Prisma engine is forbidden.
  if (process.env.UPLOADS_KV_ENABLED === "true") return true;
  if (process.env.NEXT_RUNTIME_EDGE === "cloudflare") return true;
  try {
    const ua = (globalThis as { navigator?: { userAgent?: string } }).navigator
      ?.userAgent;
    if (ua === "Cloudflare-Workers") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function createPrismaClient(connectionString: string, useAdapter: boolean) {
  const log =
    process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

  if (useAdapter) {
    const pool = new Pool({
      connectionString,
      max: 1,
      maxUses: 1,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 10_000,
      ssl:
        connectionString.includes("sslmode=require") ||
        connectionString.includes("supabase.co")
          ? { rejectUnauthorized: false }
          : undefined,
    } as ConstructorParameters<typeof Pool>[0]);
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({
    datasourceUrl: connectionString,
    log: [...log],
  });
}

/**
 * Prefer Hyperdrive on Cloudflare Workers; fall back to DATABASE_URL.
 * On Workers always use the pg driver adapter (native query engine is blocked).
 */
export const getPrisma = cache(() => {
  const onWorker = isCloudflareWorkerRuntime();

  try {
    const { env } = getCloudflareContext();
    const cf = env as KlirCloudflareEnv;
    if (cf.HYPERDRIVE?.connectionString) {
      return createPrismaClient(cf.HYPERDRIVE.connectionString, true);
    }
    if (cf.DATABASE_URL?.trim()) {
      return createPrismaClient(cf.DATABASE_URL.trim(), true);
    }
  } catch {
    // Not running inside a Cloudflare request / wrangler proxy
  }

  const url = resolveEnvDatabaseUrl();
  if (!url) {
    return (
      globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      })
    );
  }

  if (onWorker) {
    return createPrismaClient(url, true);
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma ??= createPrismaClient(url, false);
    return globalForPrisma.prisma;
  }

  return createPrismaClient(url, false);
});

/** Back-compat proxy — existing `import { prisma }` call sites keep working. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
