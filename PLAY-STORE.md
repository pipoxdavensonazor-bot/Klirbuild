# Google Play — publication automatique

Package : `app.klirline.klirbuild`

## Une seule fois (obligatoire)

Google Play **n’accepte l’API** que via un **compte de service** :

1. [Google Cloud Console](https://console.cloud.google.com/) → projet lié à Play  
2. **IAM** → Compte de service → Créer → Télécharger la clé **JSON**  
3. Activer [Google Play Android Developer API](https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com)  
4. [Play Console](https://play.google.com/console) → **Utilisateurs et autorisations** → Inviter l’email `...@....iam.gserviceaccount.com` avec droit **Admin** (ou Release apps)  
5. Créer l’app **KlirBuild** une fois (si elle n’existe pas) avec le package `app.klirline.klirbuild`

## Lancer l’upload auto

### En local / agent

```bash
# Coller le JSON téléchargé
cp ~/Downloads/*.json ./play-sa.json   # ne pas committer

export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$(cat play-sa.json)"
# ou :
# export GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=./play-sa.json

npm run play:publish
# → rebuild AAB (bundleRelease) + upload track internal
# APK sideload: npm run android:apk
```

Production :

```bash
PLAY_TRACK=production npm run play:publish
```

### GitHub Actions (100 % auto ensuite)

Repo → **Settings → Secrets → Actions** :

| Secret | Valeur |
|---|---|
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | contenu entier du JSON |
| `ANDROID_KEYSTORE_BASE64` | keystore release (optionnel si rebuild) |
| `KLIRBUILD_KEYSTORE_PASSWORD` | mot de passe keystore |

Puis : **Actions → Publish to Google Play → Run workflow**  
Ou pushez un tag `android-v1.0.2`.

## Fichiers déjà prêts

- AAB : https://klirline.app/downloads/KlirBuild-release.aab  
- Icône : https://klirline.app/downloads/play/icon-512.png  
- Bannière : https://klirline.app/downloads/play/feature-graphic.png  
- Script : `scripts/play-upload.mjs`  
- Workflow : `.github/workflows/play-publish.yml`
