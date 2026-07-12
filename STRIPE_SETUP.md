# Configurer Stripe pour KlirBuild

Guide pas à pas — **mode Test** uniquement pour commencer.

---

## Étape 1 — Compte Stripe

1. Allez sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register) (ou connectez-vous)
2. En haut à droite, activez **Mode test** (interrupteur « Test »)

---

## Étape 2 — Copier les clés API

1. Ouvrez [Developers → API keys (Test)](https://dashboard.stripe.com/test/apikeys)
2. Copiez :
   - **Publishable key** → `pk_test_…`
   - **Secret key** → `sk_test_…` (cliquez « Reveal »)

> Utilisez **`sk_test_`**, pas `rk_live_` (clé restreinte live).

---

## Étape 3 — Coller dans `.env.local`

Fichier : `c:\Users\Pipo-X Design\Downloads\Klirline Inc\KlirlineOS\.env.local`

```env
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_ICI
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_ICI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Ne collez jamais ces clés dans le chat Cursor.**

---

## Étape 4 — Créer les produits automatiquement

Dans le terminal, à la racine du projet :

```bash
npm run stripe:setup
```

Ce script crée dans Stripe :

| Plan | Mensuel | Annuel |
|------|---------|--------|
| Starter | 79 $ CAD | 790 $ CAD |
| Growth | 149 $ CAD | 1 490 $ CAD |
| Business | 299 $ CAD | 2 990 $ CAD |

Et remplit les 6 `STRIPE_PRICE_…` dans `.env.local`.

---

## Étape 5 — Vérifier

```bash
npm run stripe:verify
```

Tous les ✅ → redémarrez le serveur :

```bash
npm run dev
```

Ouvrez **http://localhost:3000/billing** — vous devez voir **Stripe: connecté (test)**.

---

## Étape 6 — Tester un paiement

### Abonnement KlirBuild

1. Cliquez **Payer — Growth** sur `/billing`
2. Carte test Stripe : `4242 4242 4242 4242`
3. Date : n'importe quelle date future · CVC : `123`

### Facture client (paiement automatique)

1. Créez / ouvrez une facture sur `/invoices`
2. Cliquez **Payer en ligne** → Checkout Stripe one-shot
3. Ou **Envoyer** : le courriel inclut automatiquement le lien Stripe si `STRIPE_SECRET_KEY` est configuré
4. Après paiement, le webhook marque la facture `paid` et crée un enregistrement `Payment`

Événements webhook utiles (en plus des abonnements) : `checkout.session.completed` (déjà listé).


---

## Étape 7 — Webhooks (recommandé)

Le plan se synchronise automatiquement après checkout via `/api/stripe/checkout-session`. Les webhooks confirment aussi les changements d'abonnement.

### Local

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copiez `whsec_…` dans `.env.local` :

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production

Voir le guide complet : **`DEPLOY.md`** (variables Netlify, URL webhook, checklist go-live).

Événements à activer : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

---

## Étape 8 — Portail client

Après un premier paiement test, le bouton **Gérer l'abonnement** sur `/billing` ouvre le portail Stripe (factures, carte, annulation).

---

## Aide

- Erreur « connexion refusée » → clé révoquée ou mauvaise clé → recréez `sk_test_`
- Erreur « Price ID manquant » → relancez `npm run stripe:setup`
- Questions : Contact@klirline.ca
