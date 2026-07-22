# Admin plateforme KlirBuild

Compte qui contrôle **toutes les entreprises** indépendamment + revenus **pubs sponsorisées**.

## Connexion

| Champ | Valeur |
|-------|--------|
| URL | https://klirline.app/login |
| Email | `admin@klirline.ca` |
| Mot de passe | `KlirAdmin!2026` (à changer après 1ère connexion) |
| Console | https://klirline.app/platform |

Override possible via env : `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.

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

**Important :** changez le mot de passe admin dès la première connexion (Paramètres / reset).
