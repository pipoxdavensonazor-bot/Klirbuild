# MonCash (Digicel) — référence KlirMarket

Source officielle Digicel (2019) : [`RestAPI_MonCash_doc.pdf`](./RestAPI_MonCash_doc.pdf)  
Copiée depuis `Klirline Inc/New folder (3)/`.

## Hosts

| Env | REST API (`HOST_REST_API`) | Gateway (`GATEWAY_BASE`) |
| --- | --- | --- |
| Sandbox | `sandbox.moncashbutton.digicelgroup.com/Api` | `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware` |
| Live | `moncashbutton.digicelgroup.com/Api` | `https://moncashbutton.digicelgroup.com/Moncash-middleware` |

Secret Edge : `MONCASH_ENV` = `sandbox` \| `live`

## Auth

`POST /oauth/token`  
Basic auth `client_id:client_secret`  
Body : `scope=read,write&grant_type=client_credentials`  
→ `access_token` (Bearer, expire ~59 s)

Secrets Edge : `MONCASH_CLIENT_ID`, `MONCASH_CLIENT_SECRET`  
Portail : [sandbox business](https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/)

## Paiement acheteur (KlirMarket)

Implémenté dans `supabase/functions/moncash-payment/index.ts` :

1. `POST /v1/CreatePayment` — body `{ amount, orderId }` (HTG, montant entier côté Digicel)
2. Redirect client : `{GATEWAY_BASE}/Payment/Redirect?token={payment_token.token}`
3. `POST /v1/RetrieveOrderPayment` — body `{ orderId }`  
   Succès si `payment.message === "successful"`  
   Vérifier `payment.cost` vs `orders.total`  
   Option : `POST /v1/RetrieveTransactionPayment` avec `{ transactionId }`

Front : MonCash **activé** par défaut (`VITE_ENABLE_MONCASH=false` pour le masquer).

## Prefunded / payout vendeur

Doc Digicel :

| Endpoint | Méthode | Body |
| --- | --- | --- |
| `/v1/Transfert` | POST | `{ amount, receiver, desc, reference }` |
| `/v1/PrefundedTransactionStatus` | POST | `{ reference }` |
| `/v1/PrefundedBalance` | GET | — |

Compte marchand **préfinancé** requis dans le portail Digicel.

## Autre

`POST /v1/CustomerStatus` — `{ account }` (statut KYC wallet client)

## Dépôt source Bolt

Remote Git dans KlirlineOS : `store_klirline` → https://github.com/pipoxdavensonazor-bot/Store_klirline.git

Comparaison (août 2026) : la version GitHub est plus ancienne (CORS `*`, `amount` client, pas de guest / RLS / email).  
**KlirlineOS `apps/klirline-store/.../moncash-payment` est la version à garder** (doc Digicel + sécurité checkout).

## Déploiement

```bash
npx supabase functions deploy moncash-payment --project-ref whybbqeeqpkbkatnkjjc --no-verify-jwt
```

Puis build store avec MonCash actif (défaut). Secrets Edge : `MONCASH_CLIENT_ID`, `MONCASH_CLIENT_SECRET`, `MONCASH_ENV=sandbox|live`.
