-- Seed contenu fil d'actualité (catégories, articles, séminaires)
-- À utiliser après d1-schema / d1-openhouse. Compatible INSERT OR IGNORE.

INSERT OR IGNORE INTO "Category" ("id","name","slug") VALUES
  ('cat-conseils','Conseils','conseils'),
  ('cat-actualites','Actualités','actualites'),
  ('cat-achat','Achat','achat'),
  ('cat-vente','Vente','vente');

INSERT OR IGNORE INTO "Article" ("id","slug","title","excerpt","content","coverUrl","published","publishedAt","categoryId","createdAt","updatedAt")
VALUES
(
  'art-visite-libre',
  'visite-libre-comment-se-preparer',
  'Visite libre : comment bien se préparer',
  'Horaires, questions à poser et documents utiles pour tirer le maximum d''une porte ouverte.',
  '## Avant d''y aller\n\nPréparez votre liste de critères et une préapprobation si possible.\n\n## Sur place\n\nObservez l''état général, le voisinage et posez des questions sur les rénovations.',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  1,
  '2026-07-01',
  'cat-conseils',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'art-premiere-maison',
  'premiere-maison-checklist',
  'Acheter sa première maison : la checklist essentielle',
  'Préapprobation, inspection, taxes scolaires… les étapes à ne pas négliger.',
  '## Avant de visiter\n\nObtenez une préapprobation hypothécaire.',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cd00?auto=format&fit=crop&w=1200&q=80',
  1,
  '2026-05-10',
  'cat-conseils',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'art-marche-laval',
  'marche-laval-ete-2026',
  'Marché immobilier Laval — aperçu été 2026',
  'Tendances locales, inventaire et conseils pour acheteurs et vendeurs cet été.',
  '## Inventaire\n\nLe marché reste dynamique dans plusieurs secteurs de Laval.',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  1,
  '2026-07-10',
  'cat-actualites',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO "Seminar" ("id","slug","title","description","imageUrl","startsAt","location","capacity","registrationOpen","createdAt","updatedAt")
VALUES
(
  'sem-premier-acheteur',
  'seminaire-premier-acheteur',
  'Séminaire : Devenir propriétaire en 2026',
  'Soirée interactive sur le parcours d''achat, le financement et les pièges à éviter.',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  '2026-08-15T18:30:00.000Z',
  'Laval — salle communautaire',
  40,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'sem-investissement',
  'atelier-investissement-locatif',
  'Atelier : Investissement locatif rentable',
  'Analyse de cash-flow, quartiers porteurs et stratégies de mise de fonds.',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
  '2026-09-10T19:00:00.000Z',
  'Saint-Jérôme',
  25,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Visites libres liées aux propriétés existantes (par slug)
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
