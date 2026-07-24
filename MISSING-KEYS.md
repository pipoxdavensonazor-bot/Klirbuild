# Clés encore manquantes (prod)

Health core OK. Billing reste `degraded` tant que Stripe n’est pas branché.

| Clé | Impact | Obligatoire ? |
|-----|--------|---------------|
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + 6 `STRIPE_PRICE_*` + `STRIPE_WEBHOOK_SECRET` | Paiements / abonnements | **Oui** pour encaisser |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Bouton « Continuer avec Google » | Non |
| `ZERNIO_API_KEY` | Pubs Meta/TikTok/etc. | Non (pubs in-app OK) |
| `DAILY_API_KEY` | Daily natif | Non (Jitsi OK) |

## Stripe (seul vrai bloqueur business)

**État agent :** ni secrets Worker, ni connexion Zapier Stripe, ni Stripe MCP auth.
« Stripe connecté » côté dashboard ne suffit pas — il faut les clés dans l’environnement agent / Worker.

1. [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) → `sk_test_` + `pk_test_`
2. Coller dans `.env.local` **ou** secrets Cursor Cloud (jamais dans le chat)
3. `npm run stripe:provision` (produits + 6 prices CAD + `wrangler secret put`)
4. Webhook → `https://klirline.app/api/stripe/webhook` → `STRIPE_WEBHOOK_SECRET`
5. `npm run deploy`
6. Vérifier `https://klirline.app/api/health` → `summary.billing: true`

Alt. Zapier MCP : connecter Stripe via
`https://mcp.zapier.com/api/v1/connect-auth/StripeCLIAPI?accountId=27053541`
puis demander à l’agent de créer les produits.

## Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Créer identifiants → **ID client OAuth** → Type **Application Web**
2. Origines JS : `https://klirline.app`
3. Redirect URI exacte : `https://klirline.app/api/auth/google/callback`
4. Publier les secrets Worker :

```bash
printf '%s' 'VOTRE_CLIENT_ID.apps.googleusercontent.com' | npx wrangler secret put GOOGLE_CLIENT_ID
printf '%s' 'VOTRE_CLIENT_SECRET' | npx wrangler secret put GOOGLE_CLIENT_SECRET
npm run deploy
```

Sans ces secrets, le bouton « Continuer avec Google » reste masqué (login email/mot de passe OK).

## Provision automatique (dès que `sk_test_` est dispo)

```bash
export STRIPE_SECRET_KEY='sk_test_…'
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_…'
npm run stripe:provision
# crée produits + 6 prices CAD + secrets Worker
npm run deploy
```
