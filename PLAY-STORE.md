# Google Play Console — KlirBuild

Package : `app.klirline.klirbuild`  
Fichiers prêts :

| Asset | Chemin |
|---|---|
| AAB (upload store) | `public/downloads/KlirBuild-release.aab` ou https://klirline.app/downloads/KlirBuild-release.aab |
| APK (test direct) | https://klirline.app/downloads/KlirBuild-release.apk |
| Icône 512 | `apps/android/play-assets/icon-512.png` |
| Feature graphic 1024×500 | `apps/android/play-assets/feature-graphic.png` |

## Upload manuel (compte déjà connecté)

1. Ouvrez [Play Console](https://play.google.com/console)
2. Créez l’app **KlirBuild** (ou ouvrez-la) — package `app.klirline.klirbuild`
3. **Production** ou **Tests internes** → Créer une version
4. Uploadez `KlirBuild-release.aab`
5. Fiche store :
   - Titre : KlirBuild
   - Icône : `play-assets/icon-512.png`
   - Bannière : `play-assets/feature-graphic.png`
   - Description courte : OS construction pour PME — chantiers, équipe, facturation.
6. Contenu de l’app / questionnaire → Publier

## Upload API (optionnel)

1. Google Cloud → créer un compte de service + clé JSON  
2. Play Console → Utilisateurs et autorisations → inviter le compte de service (Admin)  
3. Activer **Google Play Android Developer API**  
4. Lancer :

```bash
npm install googleapis
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=./play-sa.json node scripts/play-upload.mjs
```

Track par défaut : `internal` (changez avec `PLAY_TRACK=production`).
