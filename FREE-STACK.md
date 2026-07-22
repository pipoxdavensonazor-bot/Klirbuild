# Stack free essentielle — KlirBuild

Combo minimale pour faire tourner KlirBuild en prod sans payer (sauf Stripe si tu factures).

Source : [free-for.dev](https://free-for.dev/#/) + ce qui est déjà branché dans le code.

## 1. Obligatoire (déjà live)

| Besoin | Service | Statut |
|--------|---------|--------|
| Hosting | Cloudflare Workers (OpenNext) | ✅ `klirline.app` |
| DB | Supabase Postgres (pooler session) | ✅ |
| Fichiers / cache | Workers KV | ✅ |
| Auth session | Better Auth secret + cookies | ✅ |

## 2. Combo free prioritaire à activer

Ordre d’importance pour le métier construction :

1. **Email** → [Resend](https://resend.com) free (3 000/mois)  
   Secrets : `RESEND_API_KEY`, `EMAIL_FROM`, optionnel `RESEND_WEBHOOK_SECRET`
2. **IA** → [OpenRouter free](https://openrouter.ai/models?q=free) **ou** [Google AI Studio / Gemini](https://aistudio.google.com/)  
   Secrets : `OPENROUTER_API_KEY` (+ `OPENROUTER_MODEL`) **ou** `GEMINI_API_KEY`  
   Chaîne code : OpenAI → OpenRouter → Gemini → mock local
3. **Visio** → **Jitsi** automatique si pas de Daily  
   Option premium : `DAILY_API_KEY` + `NEXT_PUBLIC_DAILY_DOMAIN` — guide [`DAILY.md`](DAILY.md)
4. **Google login** → Google Cloud OAuth (gratuit)  
   Secrets : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
5. **Paiements** → Stripe (pas de vrai free forever pour SaaS) — garder pour la facturation clients

### Commandes secrets Worker

```bash
printf '%s' "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY
printf '%s' "KlirBuild <billing@klirline.ca>" | npx wrangler secret put EMAIL_FROM
printf '%s' "$OPENROUTER_API_KEY" | npx wrangler secret put OPENROUTER_API_KEY
printf '%s' "openrouter/free" | npx wrangler secret put OPENROUTER_MODEL
# ou
printf '%s' "$GEMINI_API_KEY" | npx wrangler secret put GEMINI_API_KEY
```

## 3. Clients natifs

L’app web reste la source de vérité (`https://klirline.app`).  
Les shells natifs sont de **fins wrappers** :

| Plateforme | Dossier | Techno | Sortie |
|------------|---------|--------|--------|
| Windows | `apps/desktop` | Tauri 2 | `.exe` (NSIS/MSI) |
| Android | `apps/android` | Capacitor 7 | `.apk` / `.aab` |
| Mobile rapide | PWA | `manifest` + SW | « Installer l’app » |

### Windows `.exe`

Prérequis sur une machine Windows : [Rust](https://rustup.rs), WebView2, Node.

```bash
cd apps/desktop
npm install
npm run build
# artefacts : src-tauri/target/release/bundle/nsis/*.exe
```

Cross-compile depuis Linux (experimental) :

```bash
rustup target add x86_64-pc-windows-msvc
cargo install cargo-xwin
cd apps/desktop && npm run build:windows:cross
# binaire : src-tauri/target/x86_64-pc-windows-msvc/release/klirbuild.exe
```

### Android

Prérequis : Android Studio / SDK, JDK 17+.

```bash
cd apps/android
npm install
npx cap add android   # une seule fois
npx cap sync android
npx cap open android  # Build → Generate Signed Bundle / APK
```

Variable optionnelle : `KLIRBUILD_NATIVE_URL=https://klirline.app` (ou URL de preview).

## 4. Ce qui n’est PAS critique au démarrage

- Zernio (ads sociaux)
- Daily.co (Jitsi couvre le besoin)
- OpenAI payant (OpenRouter/Gemini suffisent)
- Hyperdrive (DB directe pooler fonctionne)
