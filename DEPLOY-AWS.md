# Déploiement KlirBuild sur AWS

Alternative à Netlify quand les crédits sont épuisés. Deux options recommandées.

---

## Option A — AWS Amplify (recommandé, comme Netlify)

**Avantages** : SSR Next.js natif, variables d'env, domaine custom, free tier AWS (12 mois).

### Étapes (console web — pas besoin d'AWS CLI)

1. Créez un compte [AWS](https://aws.amazon.com) si besoin
2. Ouvrez **[AWS Amplify Console](https://console.aws.amazon.com/amplify/home)**
3. **Create new app** → **Host web app**
4. Choisissez :
   - **GitHub** (recommandé) — connectez le repo KlirlineOS, OU
   - **Deploy without Git** — zip du projet
5. Framework : **Next.js - SSR** (détection auto)
6. Build settings : le fichier `amplify.yml` à la racine est utilisé automatiquement
7. **Environment variables** — copiez depuis `.env.local` :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URL Postgres (RDS / Neon / Supabase) |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_*` (6) | IDs `price_…` |
| `NEXT_PUBLIC_APP_URL` | URL Amplify (ex. `https://main.xxxxx.amplifyapp.com`) |
| `BETTER_AUTH_SECRET` | Chaîne aléatoire longue |
| `DEMO_AUTH_BYPASS` | `false` |

8. **Save and deploy** — le build prend ~5–10 min
9. Après déploiement : mettez à jour `NEXT_PUBLIC_APP_URL` avec l'URL Amplify réelle
10. Webhook Stripe → `https://VOTRE-URL.amplifyapp.com/api/stripe/webhook`

### Domaine custom

Amplify → **Domain management** → ajoutez `app.klirline.ca` ou sous-domaine.

---

## Option B — Docker sur AWS App Runner

Pour un conteneur Node.js autonome (`Dockerfile` inclus).

### Prérequis

- [AWS CLI](https://aws.amazon.com/cli/) installé
- Docker Desktop
- Compte AWS

### Commandes

```bash
# 1. Build image locale
docker build -t klirbuild .

# 2. Test local
docker run -p 3000:3000 --env-file .env.local klirbuild

# 3. Push vers ECR (remplacez REGION et ACCOUNT_ID)
aws ecr create-repository --repository-name klirbuild --region us-east-1
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag klirbuild:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/klirbuild:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/klirbuild:latest

# 4. App Runner — créez le service dans la console avec l'image ECR
# https://console.aws.amazon.com/apprunner/
```

Variables d'env : configurez-les dans App Runner → Configuration.

---

## Option C — EC2 simple (budget minimal)

1. EC2 t3.small (Ubuntu) + Node 20
2. `git clone` + `npm ci` + `npm run build` + `npm start`
3. Nginx reverse proxy + Let's Encrypt (Certbot)
4. PM2 pour garder le processus actif : `pm2 start npm --name klirbuild -- start`

---

## Base de données sur AWS

| Service | Usage |
|---------|--------|
| **RDS Postgres** | Production AWS-native |
| **Neon / Supabase** | Plus simple, fonctionne avec Amplify |

```bash
npm run db:push
npm run db:seed
```

---

## Comparaison

| | Amplify | App Runner | Netlify |
|--|---------|------------|---------|
| Setup | Facile (GUI) | Moyen (Docker+ECR) | Facile |
| Next.js SSR | ✅ | ✅ | ✅ |
| Free tier | 12 mois AWS | Pay per use | Crédits limités |
| Votre blocage | — | — | Crédits épuisés |

---

## Vérification post-déploiement

- `https://VOTRE-URL/api/health` → `status: "ready"`
- `/login` → connexion
- `/billing` → Stripe connecté
- Webhook Stripe configuré

---

## Fichiers ajoutés au projet

- `amplify.yml` — build Amplify
- `Dockerfile` — conteneur production
- `.dockerignore`
- `next.config.ts` — `output: "standalone"` pour Docker

---

## Dépannage — site Amplify en 404 (Platform: WEB)

**Symptôme** : build vert, mais `https://staging.XXXX.amplifyapp.com` affiche 404. Dans **App settings → General**, **Platform** = `WEB` et **Framework** = `-`.

**Cause** : l'app a été créée en hébergement **statique** (zip / mauvaise détection), pas en **Next.js SSR** (`WEB_COMPUTE`).

L'écran **Edit general settings** ne permet **que** de renommer l'app — la plateforme ne se change pas depuis la console.

### Solution A — Nouvelle app depuis GitHub (recommandé, 100 % GUI)

1. [AWS Amplify Console](https://console.aws.amazon.com/amplify/home) → **Create new app** → **Host web app**
2. **GitHub** → autoriser AWS → repo `pipoxdavensonazor-bot/Klirbuild` → branche `master`
3. Vérifiez que **Framework** = **Next.js - SSR** (pas « Web » seul)
4. Build : `amplify.yml` à la racine (déjà dans le repo)
5. Variables d'env (voir tableau ci-dessus) → **Save and deploy**
6. Test : `/api/health` et `/login`
7. (Optionnel) Supprimez l'ancienne app `app7361` une fois la nouvelle OK

### Solution B — Corriger l'app existante (AWS CLI)

Prérequis : [AWS CLI](https://aws.amazon.com/cli/) + identifiants IAM (`aws configure` ou `aws login`).

```powershell
aws amplify update-app --app-id d2inlatygxuxmp --platform WEB_COMPUTE --region us-east-1
aws amplify update-branch --app-id d2inlatygxuxmp --branch-name staging --framework "Next.js - SSR" --region us-east-1
```

Puis dans Amplify → branche **staging** → **Redeploy this version**.

Vérification : **General settings** doit afficher **Platform** = `WEB_COMPUTE` et **Framework** = `Next.js - SSR`.

---

Contact : Contact@klirline.ca
