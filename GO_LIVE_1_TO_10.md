# Checklist go-live 1 → 10

Statut opérationnel au moment de la rédaction.  
Health : `curl -sS https://klirline.app/api/health | jq .`

| # | Item | Statut | Action restante |
|---|------|--------|-----------------|
| 1 | Stripe (clés, 6 prices, webhook) | ⛔ bloqué | Coller `sk_test_` + `pk_test_` (hors chat) → `npm run stripe:setup` → secrets Worker + webhook prod |
| 2 | Resend domaine + inbound | ⚠️ envoi OK / MX inbound à corriger | DNS MX `inbox.klirline.ca` → `inbound-smtp.us-east-1.amazonaws.com` (prio 10) |
| 3 | Google OAuth | ⛔ bloqué | Créer client OAuth → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| 4 | Daily.co | ⏭️ optionnel | Jitsi déjà actif ; `DAILY_API_KEY` seulement si Daily natif voulu |
| 5 | Zernio | ⛔ bloqué | `ZERNIO_API_KEY` pour pubs réseaux |
| 6 | Hyperdrive | ⛔ token CF insuffisant | Token avec **Hyperdrive Write** → `npm run cf:provision` |
| 7 | Rotation clés exposées | 📝 à faire côté compte | Voir [SECURITY-ROTATION.md](SECURITY-ROTATION.md) |
| 8 | Windows `.exe` | ✅ exe + setup NSIS | Artifacts `KlirBuild.exe` + `KlirBuild_0.1.0_x64-setup.exe` |
| 9 | Android release | ✅ APK + AAB | Artifacts `KlirBuild-release.apk` / `.aab` |
| 10 | Merge PR | 🔄 | PR Cloudflare hosting |

## 1 — Stripe (prod Cloudflare)

1. Dashboard Stripe → **Mode test** → API keys → `sk_test_…` + `pk_test_…`
2. Dans `.env.local` (jamais dans le chat) :

```env
STRIPE_SECRET_KEY=sk_test_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
NEXT_PUBLIC_APP_URL=https://klirline.app
```

3. `npm run stripe:setup` puis `npm run stripe:verify`
4. Secrets Worker :

```bash
printf '%s' "$STRIPE_SECRET_KEY" | npx wrangler secret put STRIPE_SECRET_KEY
printf '%s' "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" | npx wrangler secret put NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
printf '%s' "$STRIPE_PRICE_STARTER_MONTHLY" | npx wrangler secret put STRIPE_PRICE_STARTER_MONTHLY
printf '%s' "$STRIPE_PRICE_STARTER_YEARLY" | npx wrangler secret put STRIPE_PRICE_STARTER_YEARLY
printf '%s' "$STRIPE_PRICE_GROWTH_MONTHLY" | npx wrangler secret put STRIPE_PRICE_GROWTH_MONTHLY
printf '%s' "$STRIPE_PRICE_GROWTH_YEARLY" | npx wrangler secret put STRIPE_PRICE_GROWTH_YEARLY
printf '%s' "$STRIPE_PRICE_BUSINESS_MONTHLY" | npx wrangler secret put STRIPE_PRICE_BUSINESS_MONTHLY
printf '%s' "$STRIPE_PRICE_BUSINESS_YEARLY" | npx wrangler secret put STRIPE_PRICE_BUSINESS_YEARLY
```

5. Webhook Stripe → `https://klirline.app/api/stripe/webhook`  
   Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`  
   Puis : `printf '%s' "whsec_…" | npx wrangler secret put STRIPE_WEBHOOK_SECRET`

6. Redeploy si `NEXT_PUBLIC_*` doit être baked au build : `npm run deploy`

## 2 — Resend inbound MX

Envoi (`klirline.ca`) déjà OK. Pour la réception (`INBOUND_EMAIL_DOMAIN=inbox.klirline.ca`) :

Dans Cloudflare DNS (`klirline.ca`), sur **`inbox`** :

| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | inbox | `inbound-smtp.us-east-1.amazonaws.com` | 10 |

Retirer / désactiver les MX Cloudflare Email Routing sur `inbox` s’ils entrent en conflit.  
Token agent actuel : zone list OK, **écriture DNS records = 403** → à faire dans le dashboard ou avec un token **Zone → DNS → Edit**.

## 3 — Google OAuth

Console Google Cloud → OAuth client (Web) :

- Authorized JS origins : `https://klirline.app`
- Redirect URI : `https://klirline.app/api/auth/callback/google`  
  (ajuster si Better Auth utilise un autre path — vérifier `/api/auth`)

```bash
printf '%s' "$GOOGLE_CLIENT_ID" | npx wrangler secret put GOOGLE_CLIENT_ID
printf '%s' "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## 4 — Daily.co (optionnel)

Jitsi couvre la visio free. Pour Daily :

```bash
printf '%s' "$DAILY_API_KEY" | npx wrangler secret put DAILY_API_KEY
# + NEXT_PUBLIC_DAILY_DOMAIN si requis par le front
```

## 5 — Zernio

```bash
printf '%s' "$ZERNIO_API_KEY" | npx wrangler secret put ZERNIO_API_KEY
```

## 6 — Hyperdrive

Créer un token Cloudflare avec **Account → Hyperdrive → Edit**, puis :

```bash
DATABASE_URL="postgresql://…" npm run cf:provision
# coller l’id dans wrangler.jsonc → hyperdrive[].id
npm run deploy
```

Sans Hyperdrive, le pooler Supabase session reste utilisé.

## 8 — Windows `.exe`

Sur **Windows** (recommandé) :

```bash
cd apps/desktop
npm install
npm run build
# → src-tauri/target/release/bundle/nsis/*.exe
```

Prérequis : Rust (rustup), WebView2, Node 20+.

Cross-compile Linux → Windows possible via `cargo-xwin` + target `x86_64-pc-windows-msvc`, mais fragile hors CI Windows.

## 9 — Android

APK release signé (agent) : artifact `KlirBuild-release.apk`.  
Keystore local : `apps/android/klirbuild-release.keystore` (**gitignoré**).  
Mots de passe via `apps/android/android/keystore.properties` (gitignoré) ou env `KLIRBUILD_KEYSTORE_PASSWORD`.

AAB Play Store :

```bash
cd apps/android/android
./gradlew bundleRelease
```

## 10 — PR

Branche : `cursor/cloudflare-hosting-cd7c` → `master`.  
Merger quand le diff hosting/native est validé ; Stripe/OAuth peuvent rester secrets post-merge.
