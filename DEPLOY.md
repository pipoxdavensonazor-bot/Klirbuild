# Phase 1 — Mise en production KlirBuild

Guide pas à pas pour déployer KlirBuild sur Netlify en production.

---

## Checklist rapide

- [ ] Postgres provisionné (`DATABASE_URL`)
- [ ] `npm run db:push && npm run db:seed`
- [ ] Stripe configuré (`npm run stripe:setup` + `stripe:verify`)
- [ ] `DEMO_AUTH_BYPASS=false` en production
- [ ] `NEXT_PUBLIC_APP_URL` = URL Netlify finale
- [ ] Webhook Stripe production configuré
- [ ] `npm run production:verify` → tout ✅
- [ ] `npx netlify deploy --prod`

---

## Étape 1 — Base de données Postgres

### Option A : Netlify Database

1. Netlify → votre site → **Extensions** → **Netlify Database**
2. Provisionner Postgres
3. Copier `DATABASE_URL` dans `.env.local` et les variables Netlify

### Option B : Neon / Supabase

1. Créer un projet Postgres
2. Copier l'URL de connexion (`?sslmode=require`)

### Initialiser le schéma

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Le seed crée : `alex@klirline.demo` / `password` (entreprise démo).

---

## Étape 2 — Variables d'environnement

Copiez depuis `.env.local` vers **Netlify → Site → Environment variables** :

| Variable | Production |
|----------|------------|
| `DATABASE_URL` | URL Postgres |
| `STRIPE_SECRET_KEY` | `sk_test_…` puis `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_*` (6) | IDs `price_…` |
| `NEXT_PUBLIC_APP_URL` | `https://votre-site.netlify.app` |
| `BETTER_AUTH_SECRET` | Chaîne aléatoire 32+ caractères |
| `DEMO_AUTH_BYPASS` | **`false`** |
| `STRIPE_ALLOW_LIVE` | `true` (quand clés live) |

Vérifiez localement :

```bash
npm run production:verify
```

---

## Étape 3 — Déployer sur Netlify

### Via Git (recommandé)

1. Poussez le code sur GitHub/GitLab
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Build command : `npm run build` (déjà dans `netlify.toml`)
4. Plugin : `@netlify/plugin-nextjs` (auto)

### Via CLI

```bash
npx netlify login
npx netlify link
npx netlify deploy --prod
```

---

## Étape 4 — Webhook Stripe (production)

1. [Stripe Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. URL : `https://VOTRE-SITE.netlify.app/api/stripe/webhook`
3. Événements :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copier **Signing secret** → `STRIPE_WEBHOOK_SECRET` sur Netlify
5. Redéployer si nécessaire

---

## Étape 5 — Vérifier le déploiement

| Test | URL |
|------|-----|
| Santé | `https://VOTRE-SITE.netlify.app/api/health` |
| Stripe | `https://VOTRE-SITE.netlify.app/api/stripe/status` |
| Login | `https://VOTRE-SITE.netlify.app/login` |
| Billing | `https://VOTRE-SITE.netlify.app/billing` |
| Légal | `/privacy` et `/terms` |

Réponse `/api/health` attendue :

```json
{
  "status": "ready",
  "checks": {
    "database": { "ok": true },
    "stripe": { "ok": true },
    "auth": { "ok": true },
    "webhook": { "ok": true }
  }
}
```

---

## Étape 6 — Domaine personnalisé (optionnel)

1. Netlify → **Domain management** → **Add domain**
2. Ex. `app.klirbuild.com` ou sous-domaine de `klirline.ca`
3. Mettre à jour `NEXT_PUBLIC_APP_URL`
4. Mettre à jour l'URL webhook Stripe

---

## Auth en production

| Mode | Comportement |
|------|--------------|
| `DEMO_AUTH_BYPASS=false` | Connexion obligatoire |
| Avec `DATABASE_URL` | Inscription crée Company + User en Postgres |
| Sans DB (dev seulement) | Démo `alex@klirline.demo` / `password` |

**Inscription** : `/register` — crée une entreprise + admin (nécessite Postgres).

---

## Billing en production

- Abonnements stockés dans **Postgres** (table `Company`)
- Checkout et portail protégés par session
- Webhook synchronise plan + statut Stripe

---

## Ce qui reste après Phase 1 (Phase 2+)

- Migrer les modules (CRM, factures…) des données mock vers Postgres
- Emails transactionnels (Resend / SendGrid)
- OAuth Google
- PWA + apps natives (Play Store, Windows, macOS)

---

## Aide

- Stripe : `STRIPE_SETUP.md`
- Contact : Contact@klirline.ca
