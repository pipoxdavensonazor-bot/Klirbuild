# KlirBuild — Inventaire des applications & services

> Généré le 2026-07-23 · Document interne · Sans secrets

## 1. Vue d'ensemble

| Élément | Valeur |
|--------|--------|
| Produit | KlirBuild (AI Business / Construction OS) |
| Éditeur | Klirline Inc. |
| Site live | https://klirline.app |
| Package mobile | `app.klirline.klirbuild` |
| Hébergement principal | Cloudflare Workers (OpenNext) |

## 2. Applications clients (ce que l'utilisateur installe / ouvre)

| Application | Techno | Dossier | Artefacts | Rôle |
|-------------|--------|---------|-----------|------|
| Web app | Next.js 15 + React 19 | `src/` | Deploy Workers | Source de vérité — https://klirline.app |
| PWA | Service Worker + manifest | `public/sw.js` | Navigateur | « Installer l'app » sur mobile/desktop |
| Windows desktop | Tauri 2 | `apps/desktop` | `KlirBuild-setup.exe`, `KlirBuild.exe` | Shell natif → klirline.app |
| Android | Capacitor 7 | `apps/android` | `KlirBuild-release.apk`, `.aab` | Shell natif Android / Play Store |
| iOS | Capacitor 7 | `apps/ios` | IPA (macOS) | Shell natif iOS (scaffold) |

Téléchargements publics : https://klirline.app/download

## 3. Infrastructure & hébergement

| Service | Usage |
|---------|-------|
| Cloudflare Workers | Runtime production (OpenNext) |
| Cloudflare KV | Uploads, backups, cache Next (`UPLOADS_KV`, `BACKUPS_KV`, `NEXT_INC_CACHE_KV`) |
| Cloudflare Images | Optimisation images |
| Cloudflare DNS / domaine | klirline.app |
| Wrangler | CLI deploy / secrets |
| OpenNext (`@opennextjs/cloudflare`) | Adapter Next.js → Workers |
| Netlify (legacy) | Ancien chemin de deploy (`netlify.toml`) |
| Vercel / AWS Amplify | Docs de déploiement alternatives |

## 4. Base de données & stockage

| Service | Usage |
|---------|-------|
| PostgreSQL (Supabase / Neon-compatible) | Données métier via `DATABASE_URL` |
| Prisma ORM | Schéma, migrations, client |
| `@prisma/adapter-pg` + `pg` | Driver Postgres |

## 5. Authentification & sécurité

| Élément | Usage |
|---------|-------|
| Session cookies (`klirline_session`) | Auth maison (secret `BETTER_AUTH_SECRET`) |
| Google OAuth | Bouton « Continuer avec Google » |
| 2FA TOTP | Vérification optionnelle |
| Middleware Next | Routes protégées / publiques |
| Platform admin | `admin@klirline.ca` |

## 6. Paiements & abonnements

| Service | Usage |
|---------|-------|
| Stripe | Checkout abonnements, portail, webhooks |
| Plans | Starter / Growth / Business (mensuel + annuel CAD) |
| Endpoint | `/api/stripe/checkout`, `/api/stripe/webhook`, `/billing` |

## 7. Courriel

| Service | Usage |
|---------|-------|
| Resend | Emails transactionnels (invites, billing) |
| Cloudflare Email Routing | Forward inbound `inbox.*` |
| Domaine inbound | `inbox.klirline.ca` |

## 8. Intelligence artificielle

| Service | Usage / priorité |
|---------|------------------|
| OpenAI | Priorité 1 si `OPENAI_API_KEY` |
| OpenRouter | Priorité 2 (modèles free) |
| Google Gemini | Priorité 3 (`GEMINI_API_KEY`) |
| Mock local | Fallback sans clé |

Module app : `/ai` (Klir AI chat)

## 9. Visio & réunions

| Service | Usage |
|---------|-------|
| WebRTC natif KlirBuild | Salles in-page (`/meetings`, signaling `/api/rtc`) |
| Jitsi Meet (public) | Fallback iframe (`meet.ffmuc.net`) |
| Daily.co | Option premium (`DAILY_API_KEY`) |

## 10. Marketing & publicité

| Service | Usage |
|---------|-------|
| Zernio | Multi-publish réseaux sociaux (`ZERNIO_API_KEY`) |
| Ads sponsorisées in-app | `/ads/sponsor` + dashboard |
| Social Ads UI | `/social-ads` |
| Live social RTMP | Connexions YT/FB/TikTok/IG dans réunions |

## 11. Modules métier dans l'application

Routes principales sous `src/app/(app)/` :

- Dashboard, CRM, Clients, Devis, Factures, Paiements
- Projets / Tasks / Kanban
- Construction OS (CCQ, chantier, etc.)
- Comptabilité, Paie, Timeclock
- Documents (DMS), Inbox email, Team chat
- Meetings / Visio, Presence, Feed
- Analytics, Automations, Auto-pilot
- AI chat, Help / tutoriels
- Billing / Settings / Profile / Admin plateforme
- Social Ads, Sponsored Ads, Compliance, Reports

Modules registry (`src/modules/registry.ts`) : Cleaning, Construction, Restaurant, Medical, Retail, Education, Legal, Manufacturing OS.

## 12. Stack frontend / libraries

Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query, Zod, React Hook Form, Recharts, Lucide, next-themes, class-variance-authority, clsx, date-fns, Stripe SDK.

## 13. Outils de développement & qualité

| Outil | Usage |
|-------|-------|
| Vitest | Tests unitaires |
| Playwright | E2E |
| ESLint | Lint |
| GitHub Actions | CI (native apps, Play publish) |
| googleapis | Upload Play Store (`scripts/play-upload.mjs`) |
| tsx | Scripts TypeScript |
| Rust / cargo-xwin | Build Windows Tauri (cross) |
| Android Studio / Gradle / JDK | Build APK/AAB |

## 14. URLs utiles

- App : https://klirline.app
- Login : https://klirline.app/login
- Download : https://klirline.app/download
- Billing : https://klirline.app/billing
- Health : https://klirline.app/api/health
- Worker : https://klirbuild.pipoxdavensonazor.workers.dev

## 15. Variables d'environnement (noms seulement)

Core : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `PLATFORM_ADMIN_*`, `CRON_SECRET`

Stripe : `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`

Email : `RESEND_API_KEY`, `EMAIL_FROM`, `INBOUND_EMAIL_DOMAIN`

IA : `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`

Auth Google : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

Visio : `DAILY_API_KEY`, `NEXT_PUBLIC_DAILY_DOMAIN`, `NEXT_PUBLIC_JITSI_HOST`

Ads : `ZERNIO_API_KEY`

Play : `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
