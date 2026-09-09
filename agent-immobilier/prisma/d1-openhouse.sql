-- Create OpenHouse table for visite libre announcements
CREATE TABLE IF NOT EXISTS "OpenHouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "notes" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpenHouse_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OpenHouse_propertyId_idx" ON "OpenHouse"("propertyId");
CREATE INDEX IF NOT EXISTS "OpenHouse_startsAt_idx" ON "OpenHouse"("startsAt");
