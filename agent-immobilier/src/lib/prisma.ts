import { PrismaClient } from "@prisma/client/wasm";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers: WASM client + D1 adapter (no Node fs).
 * Local dev: falls back to standard PrismaClient + SQLite.
 */
function createPrismaClient() {
  try {
    const { env } = getCloudflareContext();
    if (env?.DB) {
      const adapter = new PrismaD1(env.DB);
      return new PrismaClient({ adapter });
    }
  } catch {
    // not on Cloudflare — use Node client below
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: NodePrisma } = require("@prisma/client") as {
    PrismaClient: typeof PrismaClient;
  };
  const globalForPrisma = globalThis as unknown as { prisma?: InstanceType<typeof NodePrisma> };
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new NodePrisma({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = createPrismaClient();
