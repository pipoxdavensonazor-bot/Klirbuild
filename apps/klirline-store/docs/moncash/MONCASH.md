# MonCash (Digicel) — KlirMarket

Source REST officielle (PDF, relue le 2026-11-09) :  
https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/resources/doc/RestAPI_MonCash_doc.pdf

Le PDF documente oauth, `CreatePayment`, `RetrieveOrderPayment` et `RetrieveTransactionPayment`.  
Il ne documente **pas** de signature de webhook, ni de secret de webhook, ni de champ devise.  
Ne pas inventer de signature. La preuve de paiement est la réponse Retrieve* (`payment.message` exactement `successful`), jamais l’URL de retour.

Ancien bouton chiffré (protocole RSA, **non utilisé** par KlirMarket) :  
https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/resources/doc/MC_Button_Doc.pdf  
Ce PDF dit que le Return URL reçoit `transactionId` en HTTP GET.

Copie locale du PDF REST : [`RestAPI_MonCash_doc.pdf`](./RestAPI_MonCash_doc.pdf).

## Hôtes

| Env | REST | Gateway |
| --- | --- | --- |
| Sandbox (défaut) | `https://sandbox.moncashbutton.digicelgroup.com/Api` | `https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware` |
| Live | `https://moncashbutton.digicelgroup.com/Api` | `https://moncashbutton.digicelgroup.com/Moncash-middleware` |

`MONCASH_ENV=live` uniquement pour l'encaissement. Toute autre valeur, y compris absente, reste en sandbox. Les versements vendeurs ne lisent pas ce drapeau.

Portails (pages de connexion, aucun appel marchand depuis ce dépôt) :

- Sandbox : https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/
- Live : https://moncashbutton.digicelgroup.com/Moncash-business/

## Secrets Edge (serveur uniquement)

Projet Supabase `whybbqeeqpkbkatnkjjc`. Jamais dans `VITE_*`, le frontend, Git ou les logs.

| Nom | Secret | Rôle |
| --- | --- | --- |
| `MONCASH_CLIENT_ID` | oui | Basic auth oauth de l'encaissement |
| `MONCASH_CLIENT_SECRET` | oui | Basic auth oauth de l'encaissement |
| `MONCASH_ENV` | non (mais serveur) | `live` pour encaisser. Absent = sandbox. Ignoré par les versements |
| `MONCASH_PAYOUT_ENV` | non (mais serveur) | Versements seulement. Absent = sandbox. `live` n'est pas posé par cette livraison |
| `MONCASH_PAYOUT_CLIENT_ID` | oui | Optionnel. Requis pour un versement live. Conserve le sandbox actuel si on remplace les clés d'encaissement |
| `MONCASH_PAYOUT_CLIENT_SECRET` | oui | Idem |

Il n’y a pas de `MONCASH_WEBHOOK_SECRET` dans la doc REST.

Jeton oauth : `expires_in` 59 secondes dans l’exemple. Un jeton neuf par appel.  
Jeton de paiement : l’exemple CreatePayment expire environ 10 minutes après `created`.

## URLs à coller dans le portail MonCash

Le PDF bouton Digicel liste Return Url et Alert Url parmi les données marchand. Il dit que la notification va au Return URL en HTTP GET avec `transactionId`. Le chiffrement RSA de ce paramètre concerne l'ancien bouton `BusinessKey`, pas l'API REST oauth. Le PDF REST ne décrit ni ces URLs, ni une signature, ni un chiffrement.

Action portail, d'abord sandbox, puis le business live :

1. Website : `https://klirline.com`
2. Return URL : `https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/notify`
3. Alert URL : `https://klirline.com/?checkout=moncash_return`

Le code n'accepte qu'un `transactionId` numérique en clair, puis confirme par Retrieve*. Une valeur chiffrée est ignorée et ne marque rien payé. Vérifier sur un paiement sandbox que l'identifiant reçu est numérique avant le live.

Le GET `notify` confirme via `RetrieveTransactionPayment`, puis redirige vers l'Alert URL.  
Le POST `notify` répond en JSON `{ received, settled }` sans marquer payé si Retrieve* ne confirme pas.  
Le front appelle `moncash-payment/verify`, qui refait Retrieve* (ou relit une commande déjà confirmée par le serveur).

Déployer `moncash-payment` avec `--no-verify-jwt`, sinon la passerelle Supabase refuse l'appel MonCash sans JWT. Cette préparation ne déploie pas.

## Versements vendeurs

`seller-payout` n'a pas de cron : le Transfert part seulement sur action vendeur ou admin. L'hôte vient de `MONCASH_PAYOUT_ENV`, jamais de `MONCASH_ENV`.

- Valeur absente : sandbox, état actuel.
- `live` sans `MONCASH_PAYOUT_CLIENT_ID` et `MONCASH_PAYOUT_CLIENT_SECRET` : refus. Les clés d'encaissement ne servent pas à un transfert live.
- Sandbox sans clés dédiées : repli sur `MONCASH_CLIENT_ID` / `MONCASH_CLIENT_SECRET`.

Avant de remplacer la paire d'encaissement par les clés live, copier la paire sandbox dans `MONCASH_PAYOUT_CLIENT_*` si les versements sandbox doivent continuer. Ne pas poser `MONCASH_PAYOUT_ENV=live` pour cette activation. Le compte préfinancé sert au Transfert, pas à l'encaissement.

## Passage live — encore bloqué

1. Appliquer `supabase/migrations/20261109173000_moncash_live_confirmation.sql` sur `whybbqeeqpkbkatnkjjc`.
2. Déployer `seller-payout` (isolation) avant de changer `MONCASH_ENV`.
3. Déployer `checkout-create` et `moncash-payment` (`--no-verify-jwt` pour ce dernier).
4. Publier le frontend qui gère `checkout=moncash_return`.
5. Poser les identifiants live d'encaissement. Ils ne sont pas dans ce dépôt.
6. Mettre `MONCASH_ENV=live` seulement ensuite.
7. Enregistrer Return URL et Alert URL sur le business live.


## Montant et devise

- Devise : HTG uniquement. L’API n’a pas de paramètre devise ni de conversion.
- Montant CreatePayment : entier de gourdes. Un total avec centimes est refusé (pas d’arrondi silencieux).
- `payment.reference` doit être l’UUID de la commande.
- `payment.cost` doit égaler le montant entier envoyé.
- `payment.message` doit être exactement `successful`.
- La même `transaction_id` ne peut pas solder deux commandes.
- Une commande déjà `completed` ne relance pas le séquestre ni l’e-mail. Une seconde transaction est refusée, sans remboursement automatique.

Le PDF REST ne publie pas de minimum ou maximum marchand. Le plafond 100 000 HTG du portefeuille MonCash Plus et les plafonds P2P de la FAQ ne sont pas des champs de CreatePayment ; le code ne les utilise pas comme rejet.
