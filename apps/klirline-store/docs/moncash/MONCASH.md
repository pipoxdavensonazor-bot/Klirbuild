# MonCash — KlirMarket

L'encaissement acheteur utilise **MonCash Connect**, pas l'OAuth Digicel.

Référence API (lue le 2026-11-09) : https://moncashconnect.com/en/docs  
Sandbox : https://moncashconnect.com/docs/sandbox

MonCash Connect n'est pas Digicel. Les clés `MONCASH_CLIENT_ID` / `MONCASH_CLIENT_SECRET` ne sont pas envoyées à `api.moncashconnect.com`. Un HTTP 401 Digicel ne dit rien sur ces clés Connect.

## Encaissement

`POST https://api.moncashconnect.com/v1/pay-create`  
`Authorization: Bearer <MONCASH_CONNECT_SECRET_KEY>`  
Corps : `{ amount, referenceId, returnUrl }`  
Réponse documentée : `{ paymentUrl, reference, expiresAt }`

`GET https://api.moncashconnect.com/v1/pay-status?referenceId=` avec le même Bearer.  
Payé seulement si `status` est `completed`, `reference` est l'UUID de commande et `amount` est l'entier HTG attendu. L'URL de retour ne suffit pas.

Webhook `POST` signé :

`https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/webhook`

- `X-MCC-Signature` : `sha256=` + HMAC-SHA256 du corps brut
- `X-MCC-Signature-V2` : `sha256=` + HMAC-SHA256 de `` `${timestamp}.${corps brut}` `` (préféré s'il est présent)
- `X-MCC-Timestamp` : secondes Unix, écart max 5 minutes
- Événements de la référence API : `payment.completed`, `payment.failed`

Même hôte sandbox et live. Le mode est la clé : `sk_test_proj_…` ou `sk_proj_…`. Pas de changement de code.

`returnUrl` envoyé : `https://klirline.com/?checkout=moncash_return&order_id=<uuid>`  
Le guide sandbox dit que Connect ajoute `reference` (et `error` / `cancelled`). Ces paramètres ne marquent pas la commande payée.

Montant : entier HTG. La référence API borne `pay-create` de 1 à 100 000. Le guide sandbox dit 1 à 1 000 000. Le code suit la référence API et refuse au-dessus de 100 000. `referenceId` : `[A-Za-z0-9_-]`, 100 caractères. L'UUID de commande convient. `Idempotency-Key` = cet UUID.

URLs de paiement acceptées, celles des exemples publiés : `https://pay.moncashconnect.com/…` et `https://moncashconnect.com/sim/…`. Un autre hôte est refusé.

Le guide sandbox contredit aussi la référence : `pay-status?reference=` sans authentification, événement `payment.cancelled`, champ `livemode`. Ces formes ne sont pas codées. `moncashTransactionId` est documenté comme toujours null : le rapprochement se fait sur `reference`.

## Secrets à recueillir (noms seulement)

| Nom | Secret | Rôle |
| --- | --- | --- |
| `MONCASH_CONNECT_SECRET_KEY` | oui | Bearer `sk_test_proj_…` puis `sk_proj_…` |
| `MONCASH_CONNECT_WEBHOOK_SECRET` | oui | HMAC `whsec_…` |
| `MONCASH_CONNECT_ORIGIN` | non | Défaut `https://klirline.com`. Doit être dans les domaines autorisés du projet, ou la liste doit rester vide |

À coller dans le projet Connect, pas dans le portail Digicel :

- Webhook : `https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/webhook`
- Domaine autorisé : `https://klirline.com` si la liste n'est pas vide

`moncash-payment` se déploie avec `--no-verify-jwt`. Cette préparation ne déploie pas.

## Versements vendeurs (Digicel, inchangés de cible)

`seller-payout` reste sur l'API Digicel `POST /v1/Transfert`. Il ne lit pas `MONCASH_ENV` et n'appelle pas Connect. `MONCASH_PAYOUT_ENV` absent = sandbox. Un transfert live exige `MONCASH_PAYOUT_CLIENT_ID` et `MONCASH_PAYOUT_CLIENT_SECRET`. Ne pas poser `MONCASH_PAYOUT_ENV=live` pour activer l'encaissement. Pas de cron.

## Déploiement parent, sans secret dans ce dépôt

1. SQL `supabase/migrations/20261109173000_moncash_live_confirmation.sql` sur `whybbqeeqpkbkatnkjjc`
2. `checkout-create` et `moncash-payment --no-verify-jwt`
3. Frontend qui envoie le retour vers `moncash-payment/verify`
4. Poser les deux secrets Connect. `sk_test_proj_` tant que le sandbox n'est pas validé, puis échanger les deux valeurs pour le live

Le connecteur Supabase de KlirlineCore est refusé (permission denied). Ce dépôt ne le contourne pas.
