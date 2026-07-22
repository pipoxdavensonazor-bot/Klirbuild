# Clés encore manquantes (prod)

Health core OK. Billing reste `degraded` tant que Stripe n’est pas branché.

| Clé | Impact | Obligatoire ? |
|-----|--------|---------------|
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + 6 `STRIPE_PRICE_*` + `STRIPE_WEBHOOK_SECRET` | Paiements / abonnements | **Oui** pour encaisser |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Bouton « Continuer avec Google » | Non |
| `ZERNIO_API_KEY` | Pubs Meta/TikTok/etc. | Non (pubs in-app OK) |
| `DAILY_API_KEY` | Daily natif | Non (Jitsi OK) |

## Stripe (seul vrai bloqueur business)

1. [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) → `sk_test_` + `pk_test_`
2. Coller dans `.env.local` (jamais dans le chat)
3. `npm run stripe:setup`
4. Pousser les secrets Worker (voir `GO_LIVE_1_TO_10.md` §1)
5. Webhook → `https://klirline.app/api/stripe/webhook`
6. `npm run deploy`

## Google

Redirect URI exacte : `https://klirline.app/api/auth/google/callback`

## Provision automatique (dès que `sk_test_` est dispo)

```bash
export STRIPE_SECRET_KEY='sk_test_…'
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_…'
npm run stripe:provision
# crée produits + 6 prices CAD + secrets Worker
npm run deploy
```
