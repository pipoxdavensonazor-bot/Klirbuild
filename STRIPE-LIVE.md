# Passer KlirBuild en Stripe LIVE (encaisser pour de vrai)

Produits + prix **live** déjà créés. Price IDs live déjà sur le Worker.
Il ne reste que les **3 clés LIVE** (le fichier `env.klirbuild.txt` était en **test**).

## 1. Dashboard Stripe — mode Live (pas Test)

Bascule le toggle **Test mode → OFF** en haut à droite.

### API keys
https://dashboard.stripe.com/apikeys  
Copie :
- `sk_live_…`
- `pk_live_…`

### Webhook
https://dashboard.stripe.com/webhooks → **Add endpoint**
- URL : `https://klirline.app/api/stripe/webhook`
- Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Copie le `whsec_…` (long, ~50+ caractères)

## 2. Pousser sur Cloudflare (terminal, dans le repo)

```bash
printf '%s' 'sk_live_…' | npx wrangler secret put STRIPE_SECRET_KEY
printf '%s' 'pk_live_…' | npx wrangler secret put NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
printf '%s' 'whsec_…'   | npx wrangler secret put STRIPE_WEBHOOK_SECRET
npm run deploy
```

## 3. Vérifier

```bash
curl -s https://klirline.app/api/stripe/status | jq '{configured,connected,modeHint,pricesReady}'
# modeHint doit être "live"
```

Puis un vrai checkout sur https://klirline.app/billing (carte réelle).

## Déjà prêt (ne rien refaire)

| Élément | Statut |
|---------|--------|
| Produits live Starter/Growth/Business | OK |
| 6 price IDs live CAD sur Worker | OK |
| `STRIPE_ALLOW_LIVE=true` | OK |
| Payment links live | OK (buy.stripe.com) |

## Si tu préfères me les faire coller

Joins un fichier `env.klirbuild.live.txt` avec **exactement** :

```
STRIPE_SECRET_KEY=sk_live_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
```

Je pousse les secrets + deploy (sans republier les valeurs dans le chat).
