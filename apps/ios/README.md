# KlirBuild iOS (IPA)

Shell Capacitor 7 → `https://klirline.app`.

Bundle ID: `app.klirline.klirbuild`

## Prérequis (macOS local)

- Xcode 16+
- CocoaPods
- Compte Apple Developer (signature / TestFlight / App Store)

```bash
cd apps/ios
npm install
npx cap sync ios
cd ios/App && pod install && cd ../..
npx cap open ios
# Xcode → Product → Archive → Distribute App → IPA
```

## CI (GitHub Actions)

Workflow `.github/workflows/ios-ipa.yml` :

1. **Toujours** : prépare le projet Xcode + CocoaPods → artefact `klirbuild-ios-xcode`
2. **Avec secrets Apple** : archive + export → artefact `KlirBuild.ipa`

Secrets requis pour un `.ipa` signé :

| Secret | Description |
|---|---|
| `IOS_CERTIFICATE_BASE64` | Certificat `.p12` en base64 |
| `IOS_CERTIFICATE_PASSWORD` | Mot de passe du `.p12` |
| `IOS_PROVISION_PROFILE_BASE64` | Profil `.mobileprovision` en base64 |
| `APPLE_TEAM_ID` | Team ID Apple Developer |

Optionnel App Store Connect (distribution TestFlight) :

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_P8`

Encoder un fichier :

```bash
base64 -i Certificates.p12 | pbcopy
base64 -i profile.mobileprovision | pbcopy
```

Sans secrets Apple, ce cloud agent Linux **ne peut pas** produire un `.ipa` signé — il faut macOS + certificat.
