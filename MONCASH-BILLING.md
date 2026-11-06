# MonCash — paiements des plans KlirBuild

MonCash (Digicel Haïti) est disponible comme **mode de paiement** sur `/billing`, à côté de Stripe.

## Particularité

MonCash est un **paiement one-shot en HTG**, pas un abonnement récurrent Stripe.
Après paiement réussi, le plan est activé pour **1 mois** ou **1 an** (`trialEndsAt` = fin de période).

## Secrets Cloudflare / `.env.local`

```bash
printf '%s' 'VOTRE_CLIENT_ID' | npx wrangler secret put MONCASH_CLIENT_ID --name klirbuild
printf '%s' 'VOTRE_CLIENT_SECRET' | npx wrangler secret put MONCASH_CLIENT_SECRET --name klirbuild
printf '%s' 'sandbox' | npx wrangler secret put MONCASH_ENV --name klirbuild
# optionnel
printf '%s' '95' | npx wrangler secret put MONCASH_HTG_PER_CAD --name klirbuild
```

## Portail Digicel

1. Créez / ouvrez le compte marchand : [sandbox](https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/) ou live
2. **URL de retour** : `https://klirline.app/billing?moncash=1`
3. Copiez Client ID + Secret

## Flux

1. `/billing` → choisir **MonCash** → **Payer MonCash — {plan}**
2. `POST /api/billing/moncash/checkout` → CreatePayment Digicel → redirect gateway
3. Retour → `POST /api/billing/moncash/verify` → active le plan

## Vérifier

```bash
curl -sS https://klirline.app/api/billing/moncash/status
# {"configured":true,"env":"sandbox","label":"MonCash (Digicel Haïti)"}
```
