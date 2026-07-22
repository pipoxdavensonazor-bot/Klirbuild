# Klirline Core OS

AI Business Operating System for SMBs — Core MVP built as a modular Next.js SaaS kernel.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS
- Prisma · PostgreSQL
- Zustand-ready UI · TanStack Query-ready · Zod/RHF-ready
- Stripe / OpenAI / Better Auth hooks (env-driven)

## Design

- Primary `#004F6E` · Accent `#D4AF37`
- Inspiration: Stripe · Notion · Linear · Vercel

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/dashboard`.

Sign in is **required** by default. Without a database, use the demo account `alex@klirline.demo` / `password`. Set `DEMO_AUTH_BYPASS=true` only for a local demo without login.

## Connect the database

1. Set `DATABASE_URL` in `.env`
2. `npx prisma db push`
3. `npm run db:generate`

## Modules covered (12-prompt series)

1. UI shell + dashboard  
2. Auth pages + multi-tenant Prisma models + middleware  
3. CRM + pipeline + client 360  
4. Quotes & invoices  
5. Stripe billing UI + webhook stub  
6. Projects / Kanban / tasks  
7. Klir AI chat + tool registry stub  
8. Automations builder MVP  
9. Analytics executive dashboard  
10. Documents DMS UI  
11. Settings hub  
12. Modular registry (`src/modules/registry.ts`) + Business OS stubs  

## Add a Business OS module

1. Add an entry in `src/modules/registry.ts`
2. Create routes under `src/app/(app)/modules/[moduleId]` or a dedicated segment
3. Enable the module on `Company.enabledModules`
4. Sidebar picks it up via `getEnabledModuleNav`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Prisma generate + Next production build (OpenNext) |
| `npm run preview` | OpenNext build + local Workers preview |
| `npm run deploy` | OpenNext build + deploy to Cloudflare |
| `npm run cf:provision` | Create Workers KV + Hyperdrive |
| `npm run db:generate` | Prisma client |
| `npm run db:push` | Push schema |

## Production host

**Cloudflare Workers (OpenNext)** — see [`DEPLOY-CLOUDFLARE.md`](DEPLOY-CLOUDFLARE.md).
Legacy Netlify notes remain in [`DEPLOY.md`](DEPLOY.md).

## Bolt prompts

See `BOLT_PROMPTS_12_SERIES.md` and `BOLT_PROMPTS_KLIRLINE_CORE_MVP.md`.
