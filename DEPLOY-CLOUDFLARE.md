# Déployer KlirBuild sur Cloudflare Workers (OpenNext)

Host compute on **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare/get-started).
Postgres stays on the existing provider behind **Hyperdrive**. Files use **R2**. Crons use Worker **Cron Triggers**.

## Avant le premier deploy (obligatoire)

1. `npx wrangler login` (ou secrets CI `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`)
2. **Activer R2** une fois : [R2 Overview](https://dash.cloudflare.com/?to=/:account/r2) — accepter les conditions (sinon erreur API `10042`)
3. Avoir `DATABASE_URL` Postgres (`?sslmode=require`)

Sans ces 3 points, `npm run deploy` / `npm run cf:provision` échoueront.

## 1. Provisionner R2 + Hyperdrive

```bash
DATABASE_URL="postgresql://…" npm run cf:provision
```

Cela crée :

| Ressource | Nom |
|-----------|-----|
| R2 | `klirbuild-uploads` |
| R2 | `klirbuild-backups` |
| R2 | `klirbuild-next-cache` |
| Hyperdrive | `klirbuild-db` |

Collez l'`id` Hyperdrive dans [`wrangler.jsonc`](wrangler.jsonc) :

```jsonc
"hyperdrive": [
  { "binding": "HYPERDRIVE", "id": "<HYPERDRIVE_ID>" }
]
```

## 2. Secrets

```bash
node scripts/cloudflare-secrets.mjs   # liste les commandes
printf '%s' "$DATABASE_URL" | npx wrangler secret put DATABASE_URL
printf '%s' "$CRON_SECRET" | npx wrangler secret put CRON_SECRET
# … Stripe, Resend, auth, Daily, Zernio, etc.
```

Vars déjà dans `wrangler.jsonc` :

- `NEXT_PUBLIC_APP_URL=https://klirline.app`
- `UPLOADS_R2_ENABLED=true`

Ajoutez aussi `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` et `NEXT_PUBLIC_DAILY_DOMAIN` (dashboard Workers → Settings → Variables, ou `wrangler.jsonc` `vars`).

## 3. Build & deploy

```bash
npm run deploy
```

URL initiale : `https://klirbuild.<account>.workers.dev`

CI optionnelle : [`.github/workflows/cloudflare-deploy.yml`](.github/workflows/cloudflare-deploy.yml) (`workflow_dispatch` + push `master`) avec secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL`.

## 4. Domaine custom `klirline.app`

1. Ajoutez la zone `klirline.app` dans Cloudflare DNS (ou transférez les nameservers)
2. Workers → `klirbuild` → **Custom Domains** → `klirline.app` (+ `www` si besoin)
3. Mettez à jour Stripe / OAuth / Resend webhooks vers `https://klirline.app/...`
4. CI : `SMOKE_BASE_URL=https://klirline.app`

## 5. Crons (déjà dans wrangler.jsonc)

| Cron (UTC) | Route |
|------------|--------|
| `0 13 * * *` | `/api/cron/automations` |
| `15 * * * *` | `/api/cron/recurring-invoices` |
| `0 7 * * *` | `/api/cron/backups` |

Le Worker custom [`workers/app.ts`](workers/app.ts) appelle ces routes en `POST` avec `Authorization: Bearer $CRON_SECRET`.

## 6. Smoke

```bash
curl -sS https://klirbuild.<account>.workers.dev/api/health | jq .
# après DNS :
curl -sS https://klirline.app/api/health | jq .
```

Login, upload document, déclencher un cron manuellement :

```bash
curl -X POST https://klirline.app/api/cron/automations \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Scripts npm

| Script | Rôle |
|--------|------|
| `npm run build` | `prisma generate` (+ optionnel db push) + `next build` |
| `npm run preview` | OpenNext build + preview local Workers |
| `npm run deploy` | OpenNext build + deploy |
| `npm run cf-typegen` | Régénère `types/cloudflare-env.d.ts` |
| `npm run cf:provision` | Buckets R2 + Hyperdrive |

`CLOUDFLARE_DB_PUSH=1` active `prisma db push` pendant le build (équivalent Netlify).

## Migration depuis Netlify

- Blobs historiques **ne sont pas** migrés automatiquement — re-upload si besoin
- `netlify.toml` est conservé en archive ; le flux actif est Cloudflare
- Déployer d’abord sur `workers.dev`, puis basculer le DNS pour limiter le downtime

## Dépannage

| Symptôme | Action |
|----------|--------|
| R2 create 10042 | Activer R2 dans le dashboard |
| Prisma / DB timeout | Vérifier Hyperdrive + `nodejs_compat` |
| Cron 401 | `CRON_SECRET` secret manquant / mismatch |
| Uploads 503 | Binding `UPLOADS_BUCKET` ou `UPLOADS_R2_ENABLED` |
| OAuth wrangler timeout | Relancer `npx wrangler login` (navigateur requis) |
