# Audit KlirBuild (lecture seule)

Date : 2026-11-04. Périmètre : dépôt `pipoxdavensonazor-bot/Klirbuild` (privé), commit `23b8842` sur `master`. Les constats marqués **vérifié** ont une preuve dans le dépôt ou une sonde HTTP publique. Le reste est **hypothèse**.

**Action manuelle (Philippe) :** le script `promote-admin.sql` a été retiré du dépôt. Il faut quand même tourner à la main le mot de passe Supabase Auth de `contact@klirline.ca` et vérifier `pipoxdavensonazor@gmail.com`. Le code ne peut pas le faire. Détail : `SECURITY-ROTATION.md`.

Produit : Construction OS (ERP chantier, CRM, estimés, CCQ Québec, paiements). Runtime observé : Worker OpenNext derrière `https://klirline.app` et `https://klirbuild.pipoxdavensonazor.workers.dev` (`x-opennext: 1`, `server: cloudflare`, `GET /api/health` → 200). `https://klirbuild.vercel.app` renvoie `DEPLOYMENT_NOT_FOUND`. L’id Worker `a88ca49a37d74ca1977c442fd05c3f43` n’apparaît pas dans le dépôt (contexte externe, non revérifié ici).

---

## Résumé priorisé

### P0

1. **Mot de passe admin boutique en clair, ciblant un projet Supabase nommé.**  
   Preuve : `apps/klirline-store/supabase/promote-admin.sql` réécrit `encrypted_password` avec `crypt('Klirline@Admin2026', …)` pour `contact@klirline.ca`, et promeut aussi `pipoxdavensonazor@gmail.com`. L’en-tête pointe `https://supabase.com/dashboard/project/htwtdoxwznvvksxtzpkp`.  
   Impact : toute personne avec le dépôt (ou un clone) peut réinitialiser l’admin de ce projet si le script est collé dans le SQL editor. Le repo est privé, donc ce n’est pas public Internet, mais le secret est dans l’historique git.  
   Correctif : retirer le script, purger l’historique si le remote a circulé, et faire tourner le mot de passe Supabase de `contact@klirline.ca` immédiatement.

### P1

2. **Identifiants démo et super-admin prédictibles dans le seed.**  
   Preuve : `prisma/seed.ts` fait `hashPassword("password")` puis `upsert` de `alex@klirline.demo` avec `update: { passwordHash }` (le seed **réécrit** le mot de passe). `PLATFORM_ADMIN_PASSWORD` retombe sur `"KlirAdmin!2026"` (idem `scripts/seed-platform-admin.ts`, email par défaut `admin@klirline.ca`). `README.md` documente `alex@klirline.demo` / `password`.  
   Impact : si `npm run db:seed` ou `db:seed-admin` a tourné sans variable d’env sur la base de prod, compte entreprise ou super-admin connu.  
   Hypothèse : la sonde `POST /api/auth/login` vers `klirline.app` a été bloquée par Cloudflare (erreur 1010, signature navigateur), donc la présence du compte en prod n’est **pas** confirmée.  
   Correctif : exiger les mots de passe via l’environnement (échec si absents), ne plus seeder ce compte en prod, et vérifier en base que ces emails n’existent pas ou ont un hash tourné.

3. **Téléchargement d’uploads sans session (fichiers de chat inclus).**  
   Preuve : `src/app/api/uploads/[...key]/route.ts` fait `getUpload(key)` sans `requireSession`. `src/middleware.ts` laisse passer tout `/api/`. `POST /api/uploads` écrit `marketing/{companyId}/{timestamp}-{Math.random()}`. `POST /api/team-chat/attachments` écrit `team-chat/{companyId}/…` (PDF, Office, ZIP, jusqu’à 25 Mo) puis `publicUploadUrl`. Sonde : `GET https://klirline.app/api/uploads/marketing/does-not-exist/nope.png` → **404**, pas 401.  
   Impact : quiconque possède l’URL lit le fichier (plans, factures, pièces jointes). `Math.random()` n’est pas un secret cryptographique.  
   Correctif : exiger une session du même `companyId`, ou des URL signées à TTL court, et ne plus publier les pièces de chat en GET anonyme.

4. **Lien client live : fuite inter-clients dans le même tenant.**  
   Preuve : `GET /api/public/client-live/[token]` renvoie l’objet `mapLive` (`src/lib/meetings/feed-service.ts`) qui inclut `clientIds`, `companyId`, `dailyRoomUrl`, `shareToken`. `listClientFeed` (lignes 161–185), si le token ne matche pas ce `clientId`, charge quand même les posts `clients`/`public` de **toute** l’entreprise dès qu’un live/meeting possède ce `shareToken`. Les tokens sont des `cuid()` Prisma (`schema.prisma`, `shareToken @default(cuid())`), pas des jetons `randomBytes` comme les invitations.  
   Impact : un lien de partage révèle les autres `clientId` de la session puis leurs posts chantier.  
   Correctif : ne retourner le fil que si `clientId` est dans `clientIds` de **cette** session, et remplacer `cuid()` par un jeton opaque 32 octets.

5. **Webhooks Stripe `invoice.paid` / `payment_failed` collés au tenant démo.**  
   Preuve : `src/app/api/stripe/webhook/route.ts` appelle `getBillingState()` sans argument. `getBillingState(companyId = DEMO_COMPANY_ID)` dans `src/lib/billing/subscription-service.ts`. Le statut n’est mis à jour que si `current.stripeCustomerId === customerId`.  
   Impact : le paiement d’un vrai client ne bascule pas son abonnement (ou ne matche que `demo_klirbuild`).  
   Correctif : résoudre `companyId` par `stripeCustomerId` en base avant `updateBillingStatus`.

6. **`prisma db push` à chaque déploiement Cloudflare, échec non bloquant.**  
   Preuve : `.github/workflows/cloudflare-deploy.yml` pose `CLOUDFLARE_DB_PUSH: "1"`. `scripts/cloudflare-build.mjs` lance `npx prisma db push` et, en cas d’échec, logue un warning puis enchaîne `next build`.  
   Impact : schéma prod modifié sans migration revue ; un push raté laisse un Worker neuf sur un schéma ancien, sans faire échouer le job.  
   Correctif : job séparé `prisma migrate deploy` qui échoue le pipeline, et retirer `db push` du build.

7. **Pas d’environnement Worker staging, Hyperdrive non branché.**  
   Preuve : `wrangler.jsonc` n’a qu’un worker `klirbuild`, pas de `env.staging`, pas de `routes`. Le bloc `hyperdrive` est commenté (`REPLACE_WITH_HYPERDRIVE_ID`). `src/lib/db.ts` préfère `cf.HYPERDRIVE` puis `DATABASE_URL`. Bindings réels : KV `UPLOADS_KV`, `BACKUPS_KV`, `NEXT_INC_CACHE_KV`, Images, service `WORKER_SELF_REFERENCE`, crons. Pas de D1, R2 ni Queues.  
   Impact : tout deploy touche la prod ; Postgres est joint en direct depuis l’isolate (latence, pooler). Le domaine `klirline.app` est attaché hors dépôt (dashboard), ce qui est cohérent avec la sonde live mais invisible au review de PR.  
   Correctif : créer un env Wrangler `staging`, décommenter Hyperdrive avec un id réel, et versionner le custom domain (`routes` / `workers_dev`).

8. **Dépendances : Next, Zod, sanitize-html (npm audit, lockfile).**  
   Preuve : `npm audit --omit=dev` au 2026-11-04, `node_modules` aligné sur le lock : `next@15.5.21`, `zod@4.4.3`, `sanitize-html@2.17.6`. Advisories : Next GHSA-2xp9-vwfh-vxw4 et GHSA-2464-fhr4-w9xw (RCE API d’optimisation d’images AVIF/SVG, corrigé ≥ 15.5.24 / > 15.5.27 selon l’avis), GHSA-p3m5-59mp-jv5r (DoS Server Actions), GHSA-p293-qw3h-jr36 (RCE **Windows** — hors runtime Workers), Zod GHSA-mrhx-c7xc-m3w5 (`< 4.6.6`), sanitize-html GHSA-g8qq-57p8-ggw5 / GHSA-x3q4-9hxx-gx8m / GHSA-cv27-6wvh-8x7j (`< 2.18.0`). CI : `npm audit` est `continue-on-error: true` (`.github/workflows/ci.yml`).  
   Impact : surface image/DoS sur le runtime Next ; XSS résiduelle sur les HTML d’e-mails passés dans `sanitize-html` ; le gate CI ne bloque pas.  
   Correctif : monter Next, Zod et sanitize-html au-dessus des plages advisory et faire échouer l’audit `high` en CI.  
   Hypothèse : l’API Image Optimization Next n’est pas le chemin Workers (binding `images` Cloudflare) ; l’exploitabilité exacte sur OpenNext n’a pas été rejouée.

9. **Rate limit login/register en mémoire d’isolate.**  
   Preuve : `src/lib/auth/rate-limit.ts` (`Map` « per isolate »). Login : 20 / 15 min / IP (`src/app/api/auth/login/route.ts`). Register ouvert sans vérification d’e-mail (`src/app/api/auth/register/route.ts`). Hash mot de passe : PBKDF2 100 000 itérations (`src/lib/auth/password.ts`), coûteux en CPU Workers (`cpu_ms: 30000` dans `wrangler.jsonc`).  
   Impact : le plafond se réinitialise par isolate ; bourrage d’identifiants et inscriptions abusives restent peu coûteux à paralléliser, et chaque essai brûle du CPU.  
   Correctif : compteur KV ou Durable Object (clé IP + e-mail) devant login et register.

### P2

10. **Secret HMAC de dev et repli TOTP.**  
    Preuve : `src/lib/auth/demo-session.ts` `fallbackDevSecret()` = `"klirbuild-dev-only-secret-change-me!!"` si `NODE_ENV !== "production"`. En production, secret absent → chaîne vide → signature refusée (fail closed). `src/lib/auth/totp-crypto.ts` fait `authSecret() ||` le même littéral, donc le repli s’applique aussi quand la prod renvoie `""`. `authenticateUser` accepte tout `*@klirline.demo` **sans** base et **hors** production (`src/lib/auth/auth-service.ts`). `DEMO_AUTH_BYPASS` est ignoré si `NODE_ENV === "production"` (`src/middleware.ts`).  
    Impact : forge de cookie seulement si un déploiement n’est pas `production`. Chiffrement TOTP avec clé publique si `BETTER_AUTH_SECRET` manque.  
    Correctif : refuser le boot sans secret ≥ 32 caractères, y compris pour TOTP.

11. **Webhook Stripe non signé hors production.**  
    Preuve : `src/app/api/stripe/webhook/route.ts` parse le JSON brut si le secret ou la signature manque et `NODE_ENV !== "production"`. En production, secret requis. Resend est fail-closed (`src/lib/email/inbound-service.ts`). Daily exige `x-webhook-secret` sauf `ALLOW_INSECURE_WEBHOOKS` hors prod (`src/app/api/daily/webhook/route.ts`), comparaison non constant-time.  
    Impact : un staging mal étiqueté accepterait des événements Stripe forgés.  
    Correctif : `constructEvent` obligatoire partout sauf flag local explicite.

12. **`STRIPE_ALLOW_LIVE=true` dans les vars versionnées.**  
    Preuve : `wrangler.jsonc` `vars`. `src/lib/stripe.ts` autorise `sk_live_` / `rk_live_` si ce flag ou `NODE_ENV=production`. Aucune clé `sk_live_` / `whsec_` / `AKIA` trouvée dans les fichiers suivis.  
    Impact : `wrangler dev` charge le flag et peut parler à Stripe live si la clé live est dans `.dev.vars`.  
    Correctif : réserver le flag au secret/dashboard de prod, pas au `wrangler.jsonc` commité.

13. **Auth des API déléguée à chaque handler.**  
    Preuve : le middleware ne protège pas `/api/`. Les routes métier vues (`clients`, `invoices`, `crm`, `accounting`, `ai/chat`, checkout Stripe) passent par `requireCompanyContext` → `requireSession` → `enrichSession`, qui **réécrit** `companyId` / `role` depuis la base et invalide `sessionVersion`. Inventaire sans marqueur d’auth : auth publique, webhooks, `public/*`, `uploads/[...key]`, `users/invite/preview`. L’aperçu d’invitation renvoie e-mail, rôle et nom d’entreprise ; le jeton est SHA-256 de 32 octets (`src/lib/auth/token-hash.ts`) — entropie correcte, pas de rate limit sur ce GET.  
    Impact : un nouvel handler qui oublie `requireCompanyContext` est public. Pas de RLS Postgres (`schema.prisma` : filtres `companyId` uniquement).  
    Correctif : test CI qui échoue si une route hors liste blanche n’appelle pas un garde, et RLS `companyId` sur les tables paie / NAS.

14. **CSP `unsafe-inline`, CSRF Lax, CORS credentials.**  
    Preuve : `src/lib/security/csp.ts` (`script-src 'self' 'unsafe-inline'`). Cookie `httpOnly`, `secure` en prod, `sameSite: "lax"` (`demo-session.ts`). CORS credentials pour `klirline.app`, `*.workers.dev` du compte, `capacitor://localhost` et `http://localhost` (`middleware.ts`). En-têtes live dupliqués (middleware + `next.config.ts` `headers()`).  
    Impact : un XSS stocké n’est pas contenu par la CSP ; CSRF cross-site limité par Lax ; une page locale `http://localhost` peut appeler l’API avec cookies.  
    Correctif : nonces CSP quand OpenNext le permet ; retirer `http://localhost` des origines de prod.

15. **Impersonation plateforme annulée par `enrichSession`.**  
    Preuve : `src/app/api/platform/impersonate/route.ts` pose un cookie `companyId` cible. `enrichSession` fait ensuite `next.companyId = user.companyId` (ligne base).  
    Impact : l’impersonation ne tient pas (échec fermé, pas une élévation). Dette produit.  
    Correctif : si `isPlatformAdmin`, conserver le `companyId` signé après contrôle que la cible existe.

16. **Dette d’hébergement et de CI.**  
    Preuve : canonique = Cloudflare (`README.md`, `npm run deploy`, `cloudflare-deploy.yml`). `netlify.toml` est marqué ARCHIVE. `DEPLOY-VERCEL.md` dit encore « Recommandé » et cite `klirbuild.vercel.app`, qui ne résout plus. `DEPLOY.md` parle encore de Netlify. CI Node 24 vs deploy Node 22. `quality` ne lance pas `npm run build` OpenNext. E2E/smoke seulement si `SMOKE_BASE_URL`. `workers/` et `apps/` exclus de `tsc` (`tsconfig.json`) alors que `strict: true`. 21 fichiers `src/**/*.test.ts`, pas de couverture. N+1 : `src/lib/social-ads/zernio-service.ts` upsert en boucle. `amplify/team-provider-info.json` commit le compte AWS `135053047579`, rôles IAM et `AmplifyAppId` (pas de clés).  
    Impact : un opérateur peut déployer la mauvaise cible ou merger un Worker qui ne build pas.  
    Correctif : une page « prod = Cloudflare only », build OpenNext en CI, Node aligné, et sortir `team-provider-info.json` du git.

17. **Métadonnées infra boutique.**  
    Preuve : projet Supabase `htwtdoxwznvvksxtzpkp` dans le SQL admin. Edge MonCash vérifie `assertOrderAccess` (`apps/klirline-store/supabase/functions/moncash-payment/index.ts`) ; credentials via `Deno.env` (pas en clair). Migrations store retirent `SELECT` anon sur commandes / profils (`supabase/migrations/20260706112113_20260706000004_security_hardening.sql`).  
    Impact : le project ref facilite le ciblage ; les politiques RLS du store ont déjà été durcies dans le dépôt.  
    Correctif : ne plus committer d’URL dashboard projet ; confirmer que la migration hardening est appliquée sur ce project ref (non vérifiable depuis le repo).

---

## Top 10 actions

1. Tourner le mot de passe Supabase de `contact@klirline.ca` et supprimer `promote-admin.sql` (et l’historique si le dépôt a été partagé).
2. Vérifier en base prod l’absence de `alex@klirline.demo` / `admin@klirline.ca` avec les mots de passe du seed ; retirer les fallbacks du code.
3. Fermer `GET /api/uploads/*` (session ou URL signée), en priorité le préfixe `team-chat/`.
4. Borner `listClientFeed` au `clientId` du token et cesser d’exposer `clientIds` + `dailyRoomUrl` bruts ; jeton de partage aléatoire.
5. Lier `invoice.paid` / `payment_failed` au `companyId` du customer Stripe.
6. Remplacer `prisma db push` du workflow Cloudflare par `migrate deploy` bloquant.
7. Ajouter un Worker `staging` et brancher Hyperdrive ; déclarer la route `klirline.app` dans `wrangler.jsonc`.
8. Mettre à jour Next (≥ correctif image/DoS), Zod ≥ 4.6.6, sanitize-html ≥ 2.18, et rendre `npm audit` bloquant au niveau high.
9. Rate limit edge (KV/DO) sur login, register et preview d’invitation.
10. Test d’inventaire des routes API + RLS sur paie/NAS ; marquer Vercel/Netlify/Amplify comme archives.

## Déjà bien

- Aucun `.env` suivi ; `.gitignore` couvre `.env*`, `.dev.vars`, `play-sa.json`, `*.pem`. Pas de `sk_live_` / `whsec_` / clé privée dans les fichiers suivis.
- CI : lint, Vitest, `tsc --noEmit`, Gitleaks (`.gitleaks.toml`), CodeQL (`.github/workflows/codeql.yml`), Dependabot, `npm run security:check`.
- Sessions HMAC, cookie `httpOnly` + `secure` en prod, `enrichSession` recalcule rôle, tenant et `sessionVersion` (changement de mot de passe invalide les cookies).
- Crons fail-closed (`src/lib/cron/authorize-cron.ts`) ; le Worker envoie `Bearer ${CRON_SECRET}` (`workers/app.ts`).
- Webhook Resend signé Svix ; Stripe `constructEvent` obligatoire en production ; checkout Stripe refuse un `session_id` d’une autre entreprise.
- Uploads : sniff magic bytes, liste blanche, `nosniff`, `Content-Disposition: attachment` pour les types dangereux (`src/lib/security/upload-security.ts` + tests).
- NAS complet seulement avec `payroll:manage` ou `accounting:manage` (`src/app/api/employees/route.ts`).
- Health public minimal ; `?detail=1` exige `HEALTH_TOKEN` ou un admin.
- En-têtes prod constatés sur `klirline.app` : HSTS preload, `X-Frame-Options: DENY`, `nosniff`, CSP avec `frame-ancestors 'none'` et `object-src 'none'`.
- TypeScript `strict`. Nombreux `@@index([companyId, …])`. Tests ciblés IDOR, CSP, auth, cron.
- Observabilité Workers activée (`head_sampling_rate: 1`). `netlify.toml` est explicitement archivé.

## Hors périmètre / non prouvé

- Contenu réel des secrets Wrangler (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `CRON_SECRET`, clés Stripe).
- Application effective des migrations RLS sur le projet Supabase store.
- Login démo en prod (bloqué par le challenge Cloudflare 1010 de cette sonde).
- Identité exacte du Worker id fourni dans le brief.
