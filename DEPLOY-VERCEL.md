# Déploiement KlirBuild sur Vercel

**Recommandé** pour Next.js 15 — plus simple qu'AWS Amplify (pas de WEB vs WEB_COMPUTE, SSR automatique).

---

## Étapes (console web — ~10 min)

### 1. Créer un compte Vercel

1. Ouvrez https://vercel.com/signup
2. **Continue with GitHub**
3. Autorisez Vercel à accéder à GitHub

### 2. Importer le projet

1. **Add New…** → **Project**
2. Repo : **`pipoxdavensonazor-bot/Klirbuild`**
3. Framework : **Next.js** (détecté automatiquement)
4. Root Directory : `.` (racine)
5. Build Command : `npm run build` (défaut — inclut `prisma generate`)
6. **Ne déployez pas encore** — ajoutez d'abord les variables d'env (étape 3)

### 3. Variables d'environnement

Dans **Environment Variables**, ajoutez (copiez depuis `.env.local`) :

| Variable | Valeur |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_STARTER_MONTHLY` | `price_…` |
| `STRIPE_PRICE_GROWTH_MONTHLY` | `price_…` |
| `STRIPE_PRICE_BUSINESS_MONTHLY` | `price_…` |
| `STRIPE_PRICE_STARTER_YEARLY` | `price_…` |
| `STRIPE_PRICE_GROWTH_YEARLY` | `price_…` |
| `STRIPE_PRICE_BUSINESS_YEARLY` | `price_…` |
| `DEMO_AUTH_BYPASS` | `false` |
| `BETTER_AUTH_SECRET` | Chaîne aléatoire 32+ caractères |
| `NEXT_PUBLIC_APP_URL` | Laissez vide pour le 1er deploy, puis mettez l'URL Vercel |

Optionnel (base de données) :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URL Postgres Neon / Supabase / Vercel Postgres |

Cochez **Production**, **Preview**, et **Development** pour chaque variable.

### 4. Déployer

1. **Deploy**
2. Attendez 3–8 min
3. Copiez l'URL (ex. `https://klirbuild-xxx.vercel.app`)
4. **Settings** → **Environment Variables** → mettez à jour `NEXT_PUBLIC_APP_URL` avec cette URL
5. **Deployments** → **Redeploy** (pour appliquer l'URL)

### 5. Webhook Stripe

Stripe Dashboard → **Webhooks** → **Add endpoint** :

```text
https://VOTRE-URL.vercel.app/api/stripe/webhook
```

Événements : `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

---

## Vérification

- `https://VOTRE-URL.vercel.app/api/health` → `status: "ready"`
- `https://VOTRE-URL.vercel.app/login`
- `https://VOTRE-URL.vercel.app/billing`

---

## Domaine custom (optionnel)

Vercel → **Settings** → **Domains** → ajoutez `app.klirline.ca`

---

## Comparaison

| | Vercel | AWS Amplify |
|--|--------|-------------|
| Next.js SSR | Automatique | Config manuelle WEB_COMPUTE |
| Setup | GitHub + clic | IAM, CLI, CloudShell |
| Free tier | Hobby gratuit | AWS free tier 12 mois |

---

## CLI (optionnel)

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.local
npx vercel --prod
```

Contact : Contact@klirline.ca
