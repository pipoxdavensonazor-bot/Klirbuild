# AGENTS.md

## Cursor Cloud specific instructions

This repo contains two independent Next.js 15 apps. The update script only installs
dependencies and generates Prisma clients; everything below (databases, dev servers,
previews) is started manually per session.

### Apps / services

| App | Path | Runtime | Dev command | Default port |
|-----|------|---------|-------------|--------------|
| Klirline OS (primary) | repo root | Next.js 15 + Prisma/PostgreSQL | `npm run dev` | 3000 |
| agent-immobilier (secondary) | `agent-immobilier/` | Next.js 15 targeting **Cloudflare Workers** (Prisma + D1) | see caveats below | 3001 (`next dev`) / 8788 (preview) |

`agent-immobilier/` only exists on some feature branches; guard any scripting with a
file-existence check.

### Klirline OS (root app)

- Standard scripts live in `package.json` (`dev`, `lint`, `test`, `db:*`). Lint = `npm run lint`, tests = `npm test` (vitest), typecheck = `npx tsc --noEmit`.
- **Demo mode (no database):** with no `DATABASE_URL`, the app runs and you can sign in with the demo account `alex@klirline.demo` / `password` (see README). DB-backed API routes return HTTP 503 in this mode; the UI shell, auth, and dashboard work.
- **Full mode (with database):** start a local PostgreSQL, set `DATABASE_URL` in `.env` (e.g. `postgresql://postgres:postgres@127.0.0.1:5432/klirline`), then `npx prisma db push` and `npm run db:seed`. PostgreSQL is NOT part of the base image — install/start it yourself when you need DB-backed features:
  ```
  sudo apt-get update -qq && sudo apt-get install -y -qq postgresql
  sudo pg_ctlcluster 16 main start
  sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" -c "CREATE DATABASE klirline;"
  ```
  After changing `DATABASE_URL`, restart `npm run dev` so it picks up the new env.
- **Typecheck caveat:** the root `tsconfig.json` `include` also pulls in `agent-immobilier/**`, so `npx tsc --noEmit` at the repo root reports many errors from that sub-app (it uses its own tsconfig/paths and Cloudflare-only modules). The root app itself is type-clean — filter with `... | grep -v '^agent-immobilier/'`, or typecheck agent-immobilier from inside its own directory.

### agent-immobilier (Cloudflare Workers app)

- `npm run dev` (plain `next dev`) boots but **500s on any DB-backed page** because `src/lib/prisma.ts` statically imports `@prisma/client/wasm` (a workerd-only module). This is by design for a Workers target, not a setup bug.
- The accurate local runtime is the OpenNext + Wrangler preview, which uses local D1/KV:
  ```
  cd agent-immobilier
  cp .env.example .env            # DATABASE_URL="file:./dev.db"; set ADMIN_PASSWORD/ADMIN_SECRET
  npx opennextjs-cloudflare build
  # seed local D1 (miniflare) — binding name is DB:
  npx wrangler d1 execute DB --local --file=prisma/d1-schema.sql
  npx wrangler d1 execute DB --local --file=prisma/d1-seed.sql
  npx wrangler d1 execute DB --local --file=prisma/d1-migrate-openhouse.sql
  npx wrangler d1 execute DB --local --file=prisma/d1-openhouse.sql
  npx opennextjs-cloudflare preview -- --port 8788
  ```
- The app enforces an HTTP→HTTPS upgrade (CSP `upgrade-insecure-requests` + HSTS). On plain `http://localhost` this causes a redirect loop / failed browser upgrade. Send `x-forwarded-proto: https` (what Cloudflare sends in prod) or front it with an HTTPS-terminating proxy.
- Local feed appears empty caveat: the repo's `prisma/d1-seed.sql` stores date-only strings that Prisma's SQLite `DateTime` decoder rejects, so `buildHomeFeed` (which `.catch(() => [])`s) drops the seeded articles locally. Data-fixture quirk, not an env issue.

### Shell gotcha

Each app reads its own `.env`. Do not `export DATABASE_URL` in a shell you also use for
`agent-immobilier` commands — an exported value overrides that app's `.env` (its SQLite
`file:./dev.db`) and Prisma will fail validation. Prefer relying on `.env`, or `unset DATABASE_URL`
before running agent-immobilier tooling.
