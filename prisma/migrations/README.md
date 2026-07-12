# Prisma migrations

KlirlineOS uses Postgres on Netlify/Neon.

## Development

```bash
# Sync schema without migration history (local quick iteration)
npm run db:push

# Or apply versioned migrations
npm run db:migrate
```

## Production (Netlify build)

The build script runs `prisma db push` which applies schema changes directly.
For teams preferring migration history, switch the build step to:

```bash
prisma generate && prisma migrate deploy && next build
```

## Phase 6 migration

`20260712140000_construction_relational` adds:

- `ConstructionJob` — chantiers en tables relationnelles
- `ConstructionLead` — pipeline commercial relationnel
- `ApiKey.keyPrefix` — affichage sécurisé des clés API

Existing JSON workspace data for jobs/leads is auto-imported on first load via `construction-service.ts`.
