# Clés encore manquantes (prod)

Produits/prix KlirBuild **créés** dans Stripe **live** (compte Klirline Inc.) et les 6 `STRIPE_PRICE_*` sont déjà dans les secrets Worker.

| Clé | Impact | Statut |
|-----|--------|--------|
| `STRIPE_SECRET_KEY` (`sk_live_…`) | Checkout / API | **À coller** (Dashboard → API keys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`) | Frontend Stripe.js | **À coller** |
| `STRIPE_WEBHOOK_SECRET` (`whsec_…`) | Webhooks abonnements | **À coller** (créer l’endpoint ci-dessous) |
| 6 × `STRIPE_PRICE_*` | Plans Starter/Growth/Business | **OK** (déjà sur Worker) |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Login Google | Optionnel |
| `ZERNIO_API_KEY` | Pubs Meta/TikTok | Optionnel |
| `DAILY_API_KEY` | Daily natif | Optionnel (Jitsi OK) |

## Stripe — finir en 3 commandes

1. Dashboard → [API keys](https://dashboard.stripe.com/apikeys) (mode **Live**) → copier `sk_live_` + `pk_live_`
2. [Webhooks](https://dashboard.stripe.com/webhooks) → Add endpoint  
   - URL : `https://klirline.app/api/stripe/webhook`  
   - Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`  
   → copier `whsec_…`
3. Pousser les 3 secrets (ne jamais les coller dans le chat) :

```bash
printf '%s' 'sk_live_…' | npx wrangler secret put STRIPE_SECRET_KEY
printf '%s' 'pk_live_…' | npx wrangler secret put NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
printf '%s' 'whsec_…'   | npx wrangler secret put STRIPE_WEBHOOK_SECRET
npm run deploy
```

4. Vérifier : `https://klirline.app/api/health` → `summary.billing: true`

### Price IDs déjà provisionnés (live CAD)

| Env | Price ID |
|-----|----------|
| `STRIPE_PRICE_STARTER_MONTHLY` | `price_1Tw76MEnAIvP8C7u3Fvalo3A` (79 CAD) |
| `STRIPE_PRICE_STARTER_YEARLY` | `price_1Tw76TEnAIvP8C7uPGrCkdlq` (790 CAD) |
| `STRIPE_PRICE_GROWTH_MONTHLY` | `price_1Tw76VEnAIvP8C7u79Caj2Yo` (149 CAD) |
| `STRIPE_PRICE_GROWTH_YEARLY` | `price_1Tw76eEnAIvP8C7udcguTfoH` (1490 CAD) |
| `STRIPE_PRICE_BUSINESS_MONTHLY` | `price_1Tw76PEnAIvP8C7u030lNQvZ` (299 CAD) |
| `STRIPE_PRICE_BUSINESS_YEARLY` | `price_1Tw76bEnAIvP8C7uAT0LhC83` (2990 CAD) |

Produits : Starter `prod_Uvz4wAUxfYj7xY` · Growth `prod_Uvz4nt9inEcemC` · Business `prod_Uvz4oNzfg5567m`

## Google

Redirect URI exacte : `https://klirline.app/api/auth/google/callback`
