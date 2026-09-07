# Google Play — publication

## Apps

| App | Package | Shell Android |
| --- | --- | --- |
| **KlirBuild** | `app.klirline.klirbuild` | `apps/android` |
| **KlirMarket** | `app.klirline.klirmarket` | `apps/klirmarket-android` |

Fiche store KlirBuild (textes + captures) : [PLAY-STORE-LISTING.md](./PLAY-STORE-LISTING.md)  
**Pack réponses questionnaires** : [PLAY-STORE-CHECKLIST.md](./PLAY-STORE-CHECKLIST.md)  
Fiche store KlirMarket (textes) : `play/klirmarket/listing/fr-FR/`

**Statut KlirBuild (2026-09-06)** : setup Play Console **3 / 11** seulement  
(politique de confidentialité, détails de connexion, pubs).  
**En attente** : classification contenu, public cible, data safety, apps gouvernementales,  
fonctionnalités financières, santé, catégorie + contact, fiche store.  
Tests fermés bloqués tant que le setup n’est pas terminé.  
Production : après closed testing (≥ 12 testeurs × 14 jours) — **pas live**.

## Une seule fois (API upload)

Google Play n’accepte l’API que via un **compte de service** :

1. [Google Cloud Console](https://console.cloud.google.com/) → projet lié à Play  
2. **IAM** → Compte de service → Créer → Télécharger la clé **JSON**  
3. Activer [Google Play Android Developer API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com)  
4. [Play Console](https://play.google.com/console) → **Utilisateurs et autorisations** → Inviter l’email `...@....iam.gserviceaccount.com` avec droit **Admin** (ou Release apps)  
5. Apps créées dans Play Console (déjà fait pour KlirBuild + KlirMarket)

## Upload

### KlirBuild

```bash
export GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=./play-sa.json
npm run play:publish
```

Fiche store (textes fr-FR + icône + feature graphic) :

```bash
export GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=./play-sa.json
npm run play:listing
```

Réponses exactes pour les 8 questionnaires restants : [PLAY-STORE-CHECKLIST.md](./PLAY-STORE-CHECKLIST.md)

### KlirMarket

```bash
# 1) Keystore dédié + keystore.properties (voir apps/klirmarket-android/README.md)
# 2) Compte de service (même que KlirBuild)
export GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=./play-sa.json
npm run play:klirmarket
# → rebuild AAB + upload track internal
```

Production :

```bash
PLAY_TRACK=production npm run play:klirmarket
```

## Dashboard KlirMarket

https://play.google.com/console/u/0/developers/5004293797228658030/app/4975719844489232688/app-dashboard

## Prochaines étapes Console (manuel)

1. Fiche Play : descriptions `play/klirmarket/listing/` + uploader graphics depuis `play/klirmarket/listing/graphics/`
2. Contenu de l’app (catégorie Shopping)  
3. Keystore créé : `apps/klirmarket-android/klirmarket-release.keystore` + `android/keystore.properties` (gitignorés — **sauvegarde obligatoire**)
4. Installer [Android Studio](https://developer.android.com/studio) puis : `npm run klirmarket:android:aab` → Internal testing  
5. Closed testing (requis avant production sur comptes perso)  
6. Demande d’accès production  
