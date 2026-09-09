-- Migration: add OpenHouse + seed feed content (run once on remote D1)
-- Safe to re-run: uses IF NOT EXISTS / INSERT OR IGNORE patterns where possible

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

-- Categories conseils + actualites (if missing)
INSERT OR IGNORE INTO "Category" ("id","name","slug") VALUES
  ('cat-conseils','Conseils','conseils'),
  ('cat-actualites','Actualités','actualites');

-- Article conseil visite libre
INSERT OR IGNORE INTO "Article" ("id","slug","title","excerpt","content","coverUrl","published","publishedAt","categoryId","createdAt","updatedAt")
VALUES (
  'art-visite-libre',
  'visite-libre-comment-se-preparer',
  'Visite libre : comment bien se préparer',
  'Horaires, questions à poser et documents utiles pour tirer le maximum d''une porte ouverte.',
  '## Avant d''y aller\n\nPréparez votre liste de critères et une préapprobation si possible.',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  1,
  '2026-07-01',
  'cat-conseils',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Open houses for existing properties (by slug lookup)
INSERT OR IGNORE INTO "OpenHouse" ("id","propertyId","startsAt","endsAt","notes","published","createdAt","updatedAt")
SELECT
  'oh-blainville',
  p.id,
  datetime('now', '+3 days', 'start of day', '+13 hours'),
  datetime('now', '+3 days', 'start of day', '+16 hours'),
  'Visite libre sans rendez-vous. Stationnement sur place.',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Property" p
WHERE p.slug = 'maison-34-27e-avenue-ouest-blainville'
LIMIT 1;

INSERT OR IGNORE INTO "OpenHouse" ("id","propertyId","startsAt","endsAt","notes","published","createdAt","updatedAt")
SELECT
  'oh-condo',
  p.id,
  datetime('now', '+4 days', 'start of day', '+14 hours'),
  datetime('now', '+4 days', 'start of day', '+16 hours', '+30 minutes'),
  'Porte ouverte — venez découvrir ce condo lumineux.',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Property" p
WHERE p.slug = 'condo-50-louis-jolliet-301-saint-jerome'
LIMIT 1;

UPDATE "Profile" SET "email" = 'bienaimeleonne_@hotmail.com', "updatedAt" = CURRENT_TIMESTAMP;
