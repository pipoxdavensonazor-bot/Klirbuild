import { prisma } from "@/lib/prisma";

let openHouseReady: Promise<void> | null = null;

/**
 * Ensure OpenHouse exists on remote D1 (CLI migrate often fails with token perms).
 * Safe to call repeatedly — CREATE IF NOT EXISTS + singleflight.
 */
export function ensureOpenHouseSchema(): Promise<void> {
  if (!openHouseReady) {
    openHouseReady = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "OpenHouse" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "propertyId" TEXT NOT NULL,
            "startsAt" DATETIME NOT NULL,
            "endsAt" DATETIME NOT NULL,
            "notes" TEXT,
            "published" BOOLEAN NOT NULL DEFAULT 1,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "OpenHouse_propertyId_fkey"
              FOREIGN KEY ("propertyId") REFERENCES "Property" ("id")
              ON DELETE CASCADE ON UPDATE CASCADE
          )
        `);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "OpenHouse_propertyId_idx" ON "OpenHouse"("propertyId")`
        );
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "OpenHouse_startsAt_idx" ON "OpenHouse"("startsAt")`
        );
      } catch {
        // Binding / adapter unavailable in some contexts — ignore
      }
    })();
  }
  return openHouseReady;
}
