# Prisma migrations

KlirlineOS uses Postgres on Netlify/Neon.

## Development

```bash
# Sync schema without migration history (local quick iteration)
npm run db:push

# Or apply versioned migrations
npm run db:migrate
```

## Production (Cloudflare deploy)

`.github/workflows/cloudflare-deploy.yml` runs `npx prisma migrate deploy` and fails the job if it errors. The OpenNext build does not run `prisma db push`.

If production was previously updated only with `db push`, baseline already-applied folders once with `prisma migrate resolve --applied <migration>` before the next deploy. The new `20261104160000_crypto_share_tokens` migration rotates short share links and will invalidate existing client live URLs.

## Phase 6 migration

`20260712140000_construction_relational` adds:

- `ConstructionJob` — chantiers en tables relationnelles
- `ConstructionLead` — pipeline commercial relationnel
- `ApiKey.keyPrefix` — affichage sécurisé des clés API

Existing JSON workspace data for jobs/leads is auto-imported on first load via `construction-service.ts`.
