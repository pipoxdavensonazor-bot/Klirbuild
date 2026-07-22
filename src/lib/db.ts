import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
// Force the workerd/wasm entry — `@prisma/client` resolves to the Node
// fs.readFileSync engine which Workers reject. See OpenNext DB howto.
import { PrismaClient } from "@prisma/client/wasm";
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

function resolveConnectionString(): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const cf = env as KlirCloudflareEnv;
    if (cf.HYPERDRIVE?.connectionString) return cf.HYPERDRIVE.connectionString;
    if (cf.DATABASE_URL?.trim()) return cf.DATABASE_URL.trim();
  } catch {
    // Not running inside a Cloudflare request / wrangler proxy
  }
  return resolveEnvDatabaseUrl();
}

function createPrismaClient(connectionString: string) {
  const log =
    process.env.NODE_ENV === "development"
      ? (["error", "warn"] as const)
      : (["error"] as const);

  // engineType=client requires a driver adapter (no Rust/WASM query engine).
  // On Cloudflare Workers, do NOT pass an explicit `ssl` object to node-postgres —
  // it often causes "Connection terminated unexpectedly" with Supabase.
  // Prefer Hyperdrive when available (binding below); otherwise rely on URL sslmode.
  // See https://github.com/brianc/node-postgres/issues/3144
  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    maxUses: 1,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 0,
    allowExitOnIdle: true,
  });

  return new PrismaClient({ adapter, log: [...log] });
}

/**
 * Prefer Hyperdrive on Cloudflare Workers; fall back to DATABASE_URL.
 * Always use @prisma/adapter-pg (engineType=client — no native/WASM engine).
 */
export const getPrisma = cache(() => {
  const url = resolveConnectionString();
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant — configurez Postgres (Hyperdrive / secret DATABASE_URL)."
    );
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma ??= createPrismaClient(url);
    return globalForPrisma.prisma;
  }

  return createPrismaClient(url);
});

/** Back-compat proxy — existing `import { prisma }` call sites keep working. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
