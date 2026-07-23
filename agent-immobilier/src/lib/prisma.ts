import { PrismaClient } from "@prisma/client/wasm";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type Client = PrismaClient;

/**
 * Per-request Prisma client on Cloudflare (D1 + WASM).
 * Module-level singletons break on Workers because `getCloudflareContext()`
 * is only valid inside a request.
 */
function createWorkerClient(): Client {
  const { env } = getCloudflareContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (env as any)?.DB;
  if (!db) {
    throw new Error("Binding D1 manquant (env.DB)");
  }
  const adapter = new PrismaD1(db);
  return new PrismaClient({ adapter });
}

function createNodeClient(): Client {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: NodePrisma } = require("@prisma/client") as {
    PrismaClient: new () => Client;
  };
  const g = globalThis as unknown as { __leonnePrisma?: Client };
  if (!g.__leonnePrisma) {
    g.__leonnePrisma = new NodePrisma();
  }
  return g.__leonnePrisma;
}

function getClient(): Client {
  try {
    return createWorkerClient();
  } catch {
    return createNodeClient();
  }
}

export const prisma = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
