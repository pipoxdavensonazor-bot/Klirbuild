# Admin plateforme KlirBuild

Compte qui contrôle **toutes les entreprises** indépendamment + revenus **pubs sponsorisées**.

## Connexion

| Champ | Valeur |
|-------|--------|
| URL | https://klirline.app/login |
| Email | `admin@klirline.ca` (ou `PLATFORM_ADMIN_EMAIL`) |
| Mot de passe | **aucun défaut.** Définir `PLATFORM_ADMIN_PASSWORD` (12+ caractères) au moment du seed. |
| Console | https://klirline.app/platform |

## Capacités

- Liste de toutes les entreprises (plan, statut, users, MRR estimé)
- Changer le plan d’une entreprise
- Suspendre / réactiver une entreprise
- **Entrer** dans le contexte d’une entreprise (impersonation légère)
- Modérer les campagnes **KlirBuild Ads** (approuver / pause / rejeter)
- Voir le revenu pubs (30j + lifetime) + MRR SaaS

## Monétisation pubs sponsorisées

Inventaire **in-app** (dashboard des entreprises) :

- CPM ≈ 8 $ CAD / 1 000 impressions
- CPC ≈ 1,50 $ CAD
- **100 %** du spend → revenu plateforme Klirline Inc.

Les annonceurs créent des campagnes sur `/ads/sponsor`.  
L’admin les active depuis `/platform` → onglet Pubs.

## Seed / prod

```bash
# migration
npx prisma migrate deploy

# compte admin seulement
PLATFORM_ADMIN_PASSWORD='…' npx tsx scripts/seed-platform-admin.ts

# ou seed complet
npm run db:seed
```

Le seed complet ne réécrit un mot de passe existant que si `ALLOW_SEED_PASSWORD_RESET=true`. Le script `seed-platform-admin.ts` exige `PLATFORM_ADMIN_PASSWORD` et met à jour le hash : c’est le chemin explicite de rotation applicative.
