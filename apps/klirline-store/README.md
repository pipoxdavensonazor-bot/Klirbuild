# Klirline Store

Haiti marketplace (Vite + React + Supabase + Digicel MonCash). Sourced from Bolt project **02_Klirline Store** (`sb1-58btvwty`).

## Run locally

```bash
# from repo root
npm run store:install
cp apps/klirline-store/.env.example apps/klirline-store/.env
# fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run store:dev
```

Without Supabase env vars the app runs in **demo catalog** mode (curated products, no live auth/cart).

## Edge secrets checklist (Supabase — not Cloudflare)

Paste in **Supabase → Project Settings → Edge Functions → Secrets** (project `whybbqeeqpkbkatnkjjc`):

| Secret | Notes |
| --- | --- |
| `RESEND_API_KEY` / `RESEND_FROM` | Order + stock emails (`Klirline Store <noreply@klirline.ca>`) |
| `STRIPE_SECRET_KEY` | Use **`sk_test_…`** for E2E — [Stripe API keys](https://dashboard.stripe.com/acct_1OunsBEnAIvP8C7u/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | `checkout.session.completed` webhook |
| `MONCASH_CLIENT_ID` / `MONCASH_CLIENT_SECRET` / `MONCASH_ENV` | Digicel (after Stripe test) |

```bash
# from apps/klirline-store — uses local .env VITE_SUPABASE_* only; never prints secrets
node scripts/check-edge-ready.mjs
node scripts/test-guest-checkout.mjs
```

## Security (P0)

Migration `supabase/migrations/20260726180000_p0_security_hardening.sql` must be applied on the live Supabase project (SQL Editor or `supabase db push`):

- Blocks self-escalation of `profiles.is_admin`
- Removes client `UPDATE` on `orders` (only edge/service role completes payment)
- Product `INSERT` requires approved vendor KYC

## Phase A — KYC Haïti (ID + Mairie)

Migration `supabase/migrations/20260726190000_phase_a_kyc_mairie_storage.sql`:

- Colonne `address_proof_url` (attestation / certificat de résidence Mairie)
- Checklist admin (`checklist_id_ok`, `checklist_selfie_ok`, `checklist_mairie_ok`) — approbation bloquée sans les 3
- Bucket Storage privé `vendor-kyc` (upload caméra depuis le téléphone)

## Phase B — Escrow + livraison + versement

Migration `supabase/migrations/20260726200000_phase_b_escrow_fulfillment.sql`:

- Table `order_fulfillments` (séquestre par vendeur, commission **8 %**)
- Après MonCash verify → `create_order_fulfillments`
- Vendeur : expédier → confirmer livraison + photo → versement
- Auto-éligibilité **J+7** après `shipped`
- Adresse de livraison sur `orders` + checkout
- Bucket `delivery-proofs`

Appliquer Phase A + B dans Supabase SQL Editor, redeploy edge MonCash, puis:

```bash
npm run store:deploy
```

## Phase C — Adoption Haïti

- **FR / Kreyòl** : bouton `FR`/`KR` dans le header (`src/i18n`)
- **Auth téléphone OTP (+509)** : onglet Téléphone dans AuthModal (nécessite Phone Auth + SMS Twilio dans Supabase)
- **WhatsApp** : bouton flottant d’aide + lien « Prévenir le vendeur » après paiement
- **Zones livraison** : frais HTG par département (`getShippingFee`) + colonne `shipping_fee`

Migration : `supabase/migrations/20260726210000_phase_c_shipping_fee.sql`

Env optionnel : `VITE_WHATSAPP_SUPPORT=509XXXXXXXX`

Redeploy the edge function after pulling:

```bash
npx supabase functions deploy moncash-payment --project-ref whybbqeeqpkbkatnkjjc
```

## Stripe (carte + Link)

En parallèle de MonCash, le checkout propose **Carte / Stripe Link** via Checkout hébergé.

```bash
npx supabase functions deploy stripe-checkout --project-ref whybbqeeqpkbkatnkjjc --no-verify-jwt
```

Secrets Edge (Dashboard → Edge Functions → Secrets) :

- `STRIPE_SECRET_KEY` = `sk_live_…` ou `sk_test_…` (compte Klirline Inc.)
- `STRIPE_WEBHOOK_SECRET` = `whsec_…` (endpoint webhook)
- `STRIPE_HTG_PER_USD` = `132` (taux de conversion HTG → USD, optionnel)
- `ALLOWED_ORIGINS` = déjà défini pour MonCash
- `RESEND_API_KEY` = clé API Resend (confirmations commande + alertes stock)
- `RESEND_FROM` = `Klirline Store <noreply@klirline.ca>` (domaine vérifié chez Resend)

Webhook Stripe → `https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/stripe-checkout/webhook`  
Événement : `checkout.session.completed`

Après paiement réussi (Stripe webhook/verify, MonCash verify, NatCash callback/verify), un email de confirmation FR est envoyé via Resend (idempotent : colonne `confirmation_email_sent_at`).

Dans le Dashboard Stripe → Payment methods : activer **Card** et **Link**.

Migration : `supabase/migrations/20260727050000_stripe_card_payments.sql`

## NatCash (Natcom mobile money)

Checkout propose **NatCash** (Natcom) en plus de MonCash et Stripe. Même flux popup + vérification.

```bash
npx supabase functions deploy natcash-payment --project-ref whybbqeeqpkbkatnkjjc --no-verify-jwt
```

Secrets Edge :

- `NATCASH_PRIVATE_KEY`
- `NATCASH_PARTNER_CODE`
- `NATCASH_FUNCTION_CODE`
- `NATCASH_USERNAME`
- `NATCASH_PASSWORD`
- `NATCASH_CALLBACK_URL` = `https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/natcash-payment/callback` (à déclarer aussi chez Natcom)
- `NATCASH_RETURN_URL` = `https://klirline.com` (redirect après callback)
- `NATCASH_DEBUG` = `true` pour sandbox (`testmerchantpay.natcom.com.ht`), sinon live
- `NATCASH_ENABLE_FEE` = `true` (défaut) — frais côté payeur
- `NATCASH_LANGUAGE` = `ht` | `fr` | `en`

Migration : `supabase/migrations/20260727060000_natcash_payments.sql`

## Seller payouts (MonCash Transfer)

Après livraison confirmée (ou J+7), le vendeur clique **Recevoir** → Digicel `POST /v1/Transfert` envoie le **net** (après 8 %) vers son portefeuille MonCash.

```bash
npx supabase functions deploy seller-payout --project-ref whybbqeeqpkbkatnkjjc
```

Prérequis Digicel : compte marchand **préfinancé** (prefunded) activé pour Transfert — mêmes secrets `MONCASH_CLIENT_ID` / `MONCASH_CLIENT_SECRET` / `MONCASH_ENV`.

Migration : `supabase/migrations/20260727070000_seller_moncash_payouts.sql`

NatCash auto-payout et virement UniBank : pas encore (UniBank n’a pas d’API publique ; NatCash payout à brancher plus tard).

## Abonnement Sponsored (vendeurs)

Les vendeurs KYC peuvent souscrire **Sponsored** (30 jours) : produits en tête du fil d’actualité + badge + suivi prioritaire admin.

```bash
npx supabase functions deploy seller-sponsor-checkout --project-ref whybbqeeqpkbkatnkjjc --no-verify-jwt
```

Secrets optionnels :

- `SPONSOR_PRICE_HTG` = `5000` (défaut)
- `SPONSOR_DURATION_DAYS` = `30`
- Stripe : mêmes `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_HTG_PER_USD`

Webhook Stripe (même secret) : événement `checkout.session.completed` — metadata `type=seller_sponsor`.  
URL webhook supplémentaire (ou même endpoint multi-fonctions) :  
`https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/seller-sponsor-checkout/webhook`

Migration : `supabase/migrations/20260727080000_seller_sponsored_subscription.sql`

Required Edge secrets (Dashboard → Edge Functions → Secrets):

- `MONCASH_CLIENT_ID`
- `MONCASH_CLIENT_SECRET`
- `MONCASH_ENV` = `sandbox` or `live`
- `ALLOWED_ORIGINS` = `https://klirline.com,https://www.klirline.com,https://klirline-store.pages.dev,http://localhost:5173`

Set secret `ALLOWED_ORIGINS` (comma-separated), e.g.:

`https://klirline.com,https://www.klirline.com,https://klirline-store.pages.dev,http://localhost:5173`

Promote first admin (service role / SQL editor only):

```sql
UPDATE profiles SET is_admin = true WHERE id = '<your-user-uuid>';
```

```bash
# from repo root (requires wrangler login)
npm run store:deploy
```

Live URLs:
- Production (Pages): https://klirline-store.pages.dev
- Custom domains (attached, DNS pending activation): https://klirline.com · https://www.klirline.com · https://store.klirline.com

### Custom domain (klirline.com)

Domains are already added on the **klirline-store** Pages project. Wrangler OAuth cannot write DNS (`zone:read` only), so finish in the dashboard:

1. Open [Custom domains](https://dash.cloudflare.com/a9a3f1c8c174988e084ba22e233c1df2/pages/view/klirline-store/domains) → confirm `klirline.com`, `www`, and `store` show **Active**.
2. If DNS is missing, go to [DNS for klirline.com](https://dash.cloudflare.com/a9a3f1c8c174988e084ba22e233c1df2/a17d21d3c4adef785cae95452cb543fa/dns/records) and add (proxied):
   - `klirline.com` → CNAME → `klirline-store.pages.dev`
   - `www` → CNAME → `klirline-store.pages.dev`
   - `store` → CNAME → `klirline-store.pages.dev`
3. Retail OS default store URL is `https://klirline.com` (`NEXT_PUBLIC_KLIRLINE_STORE_URL`).
4. Redeploy MonCash edge with `ALLOWED_ORIGINS` including `https://klirline.com` and `https://store.klirline.com`.

Redeploy anytime:
```bash
npm run store:deploy
```


Set Vite env at build time for live Supabase (or leave empty for demo catalog):

```bash
# PowerShell example before deploy
$env:VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:VITE_SUPABASE_ANON_KEY="your-anon-key"
npm run store:deploy
```

Or configure the same vars in Cloudflare Dashboard → Pages → klirline-store → Settings → Environment variables, then use Git builds.

## Wire into KlirlineOS

- Module: **Retail OS** → `/modules/retail-os`
- Live preview default: `https://klirline.com`
- Fallback Pages URL: `https://klirline-store.pages.dev`
- Override with `NEXT_PUBLIC_KLIRLINE_STORE_URL`

## Brand

- Primary `#004F6E` · Accent `#D4AF37`
- Product name: **Klirline Store** (not ShopHub)

## Database cleanup

Apply `supabase/migrations/20260726150000_cleanup_junk_products.sql` on the live Supabase project to remove test listings (`Diven`, `TRY`, `kEPI`, etc.).
