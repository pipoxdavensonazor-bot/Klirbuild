# KlirBuild Android

Shell Capacitor 7 → `https://klirline.app`.

## Setup (une fois)

```bash
cd apps/android
npm install
npx cap add android
```

Ajoute dans `android/app/src/main/AndroidManifest.xml` (si absents) :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## Build APK

```bash
npx cap sync android
npx cap open android
# Android Studio → Build → Build Bundle(s) / APK(s)
```

Ou en CLI :

```bash
cd android && ./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

## URL cible

Par défaut `https://klirline.app`. Override :

```bash
KLIRBUILD_NATIVE_URL=https://klirbuild.pipoxdavensonazor.workers.dev npx cap sync android
```
