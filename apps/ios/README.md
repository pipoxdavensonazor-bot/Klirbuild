# KlirBuild iOS (IPA)

Shell Capacitor 7 → `https://klirline.app`.

## Prérequis (macOS)

- Xcode 16+
- CocoaPods
- Compte Apple Developer (pour signer / TestFlight / App Store)

```bash
cd apps/ios
npm install
npx cap add ios   # une fois
npx cap sync ios
npx cap open ios
# Xcode → Product → Archive → Distribute App → IPA
```

## CI

Workflow `.github/workflows/ios-ipa.yml` (macos-latest) produit un `.ipa` si les secrets Apple sont définis :

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_P8` (contenu .p8)
- `IOS_CERTIFICATE_BASE64` + `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISION_PROFILE_BASE64`

Sans secrets : le job prépare le projet Xcode (pas de signature).
