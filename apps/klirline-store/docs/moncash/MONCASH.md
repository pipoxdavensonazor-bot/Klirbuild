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

`MONCASH_ENV=live` uniquement. Toute autre valeur, y compris absente, reste en sandbox.

Portails (pages de connexion, aucun appel marchand depuis ce dépôt) :

- Sandbox : https://sandbox.moncashbutton.digicelgroup.com/Moncash-business/
- Live : https://moncashbutton.digicelgroup.com/Moncash-business/

## Secrets Edge (serveur uniquement)

Projet Supabase `whybbqeeqpkbkatnkjjc`. Jamais dans `VITE_*`, le frontend, Git ou les logs.

| Nom | Secret | Rôle |
| --- | --- | --- |
| `MONCASH_CLIENT_ID` | oui | Basic auth oauth |
| `MONCASH_CLIENT_SECRET` | oui | Basic auth oauth |
| `MONCASH_ENV` | non (mais serveur) | `live` ou sandbox |

Il n’y a pas de `MONCASH_WEBHOOK_SECRET` dans la doc REST.

Jeton oauth : `expires_in` 59 secondes dans l’exemple. Un jeton neuf par appel.  
Jeton de paiement : l’exemple CreatePayment expire environ 10 minutes après `created`.

## URLs à coller dans le portail MonCash

Return URL (notification ; `transactionId` n’est qu’un identifiant) :

`https://whybbqeeqpkbkatnkjjc.supabase.co/functions/v1/moncash-payment/notify`

Alert URL (page navigateur) :

`https://klirline.com/?checkout=moncash_return`

Le GET `notify` confirme via `RetrieveTransactionPayment`, puis redirige vers l’Alert URL.  
Le POST `notify` répond en JSON `{ received, settled }` sans marquer payé si Retrieve* ne confirme pas.  
Le front appelle `moncash-payment/verify`, qui refait Retrieve* (ou relit une commande déjà confirmée par le serveur).

Déployer avec `--no-verify-jwt`, sinon la passerelle Supabase refuse l’appel MonCash sans JWT. Cette préparation ne déploie pas.

## Montant et devise

- Devise : HTG uniquement. L’API n’a pas de paramètre devise ni de conversion.
- Montant CreatePayment : entier de gourdes. Un total avec centimes est refusé (pas d’arrondi silencieux).
- `payment.reference` doit être l’UUID de la commande.
- `payment.cost` doit égaler le montant entier envoyé.
- `payment.message` doit être exactement `successful`.
- La même `transaction_id` ne peut pas solder deux commandes.
- Une commande déjà `completed` ne relance pas le séquestre ni l’e-mail. Une seconde transaction est refusée, sans remboursement automatique.

Le PDF REST ne publie pas de minimum ou maximum marchand. Le plafond 100 000 HTG du portefeuille MonCash Plus et les plafonds P2P de la FAQ ne sont pas des champs de CreatePayment ; le code ne les utilise pas comme rejet.

## Passage live — encore bloqué

1. Appliquer `supabase/migrations/20261109173000_moncash_live_confirmation.sql` sur `whybbqeeqpkbkatnkjjc`.
2. Poser les identifiants **live** (distincts du sandbox) dans les secrets Edge. Ils ne sont pas dans ce dépôt.
3. Mettre `MONCASH_ENV=live` seulement ensuite.
4. Enregistrer Return URL et Alert URL sur le business live.
5. Redéployer `moncash-payment` avec `--no-verify-jwt`.

`MONCASH_ENV` est aussi lu par `seller-payout` (`POST /v1/Transfert`). Le passer à `live` pointe les versements vendeurs vers la prod. Ne pas déclencher de versement pour tester.

Le compte préfinancé sert au Transfert vendeur, pas à l’encaissement acheteur.
