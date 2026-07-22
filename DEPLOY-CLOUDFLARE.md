# Déployer KlirBuild sur Cloudflare Workers (OpenNext)

Host compute on **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare/get-started).
Postgres stays behind **Hyperdrive**. Fichiers + cache Next utilisent **Workers KV** (pas de R2 / pas d’abonnement objet storage).

## Pourquoi KV et pas R2

Sur certains comptes Cloudflare, R2 exige une souscription / moyen de paiement (`10042`).  
Workers KV est disponible et déjà provisionné pour KlirBuild :

| Binding | KV title | Usage |
|---------|----------|--------|
| `UPLOADS_KV` | `klirbuild-uploads` | Images / pièces jointes (max app 5 Mo ; limite KV ≈ 25 Mo) |
| `BACKUPS_KV` | `klirbuild-backups` | JSON backups entreprise |
| `NEXT_INC_CACHE_KV` | `klirbuild-next-cache` | Cache incremental OpenNext |

## Avant le premier deploy

1. `npx wrangler login` **ou** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
2. `DATABASE_URL` Postgres pour Hyperdrive / Prisma

### Prisma sur Workers (obligatoire)

- `engineType = "client"` dans `prisma/schema.prisma` (pas de moteur Rust/WASM Node)
- Import `@prisma/client/wasm` dans `src/lib/db.ts`
- `serverExternalPackages`: `@prisma/client` **et** `.prisma/client`
- Après `opennextjs-cloudflare build`, `npm run cf:copy-prisma-wasm` copie `query_compiler_bg.wasm`

### Supabase sans Hyperdrive

Sur Workers, **ne pas** mettre `?sslmode=require` dans le secret `DATABASE_URL` (sinon `Connection terminated unexpectedly` avec `node-postgres`).
Utiliser le pooler **session** (port `5432`) et le bon host (`aws-0` **ou** `aws-1`… — celui du dashboard), user `role.projectref` :

```text
postgresql://klirbuild.<project-ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres
```

Hyperdrive reste recommandé en prod (token avec permission Hyperdrive Write).

## 1. Provision (KV déjà créés)

Les ids KV sont dans [`wrangler.jsonc`](wrangler.jsonc). Pour Hyperdrive :

```bash
DATABASE_URL="postgresql://…" npm run cf:provision
```

Collez l’`id` Hyperdrive :

```jsonc
"hyperdrive": [
  { "binding": "HYPERDRIVE", "id": "<HYPERDRIVE_ID>" }
]
```

## 2. Secrets

```bash
npm run cf:secrets
printf '%s' "$DATABASE_URL" | npx wrangler secret put DATABASE_URL
printf '%s' "$CRON_SECRET" | npx wrangler secret put CRON_SECRET
# … Stripe, Resend, auth, Daily, Zernio, etc.
```

Vars dans `wrangler.jsonc` : `NEXT_PUBLIC_APP_URL`, `UPLOADS_KV_ENABLED=true`.

## 3. Deploy

```bash
npm run deploy
```

→ `https://klirbuild.<account>.workers.dev`

CI : [`.github/workflows/cloudflare-deploy.yml`](.github/workflows/cloudflare-deploy.yml).

## 4. Domaine `klirline.app`

Workers → Custom Domains → `klirline.app`, puis maj webhooks Stripe/OAuth/Resend + `SMOKE_BASE_URL`.

## 5. Crons

| Cron (UTC) | Route |
|------------|--------|
| `0 13 * * *` | `/api/cron/automations` |
| `15 * * * *` | `/api/cron/recurring-invoices` |
| `0 7 * * *` | `/api/cron/backups` |

Auth : `Authorization: Bearer $CRON_SECRET` via [`workers/app.ts`](workers/app.ts).

## 6. Smoke

```bash
curl -sS https://klirbuild.<account>.workers.dev/api/health | jq .
curl -X POST https://klirline.app/api/cron/automations \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Limites KV

- Valeur max ≈ **25 MiB** (uploads app déjà limités à 5 Mo)
- Cohérence éventuelle (OK pour assets ; OpenNext déconseille KV pour ISR très strict — acceptable ici)

## Migration Netlify

- Anciens Netlify Blobs non migrés automatiquement
- `netlify.toml` archivé ; flux actif = Cloudflare

## Dépannage

| Symptôme | Action |
|----------|--------|
| Upload 503 | Binding `UPLOADS_KV` / `UPLOADS_KV_ENABLED` |
| Cron 401 | Secret `CRON_SECRET` |
| DB timeout | Hyperdrive + `nodejs_compat` |
| Wrangler OAuth timeout | Utiliser `CLOUDFLARE_API_TOKEN` |
