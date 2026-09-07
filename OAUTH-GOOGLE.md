# Google OAuth — activation KlirBuild

Le code est **déjà prêt** (`/api/auth/google` + callback).  
Il manque seulement le client Google + 2 secrets Cloudflare.

## 1) Créer le client OAuth (toi — 3 min)

1. Ouvre : https://console.cloud.google.com/apis/credentials  
2. Projet : celui de Klirline / KlirBuild (ou crée « KlirBuild »)  
3. **Créer des identifiants** → **ID client OAuth**  
4. Type : **Application Web**  
5. Nom : `KlirBuild Web`  
6. **Origines JavaScript autorisées** :
   ```
   https://klirline.app
   ```
7. **URI de redirection autorisées** (exact) :
   ```
   https://klirline.app/api/auth/google/callback
   ```
8. **Créer** → copie :
   - ID client → `….apps.googleusercontent.com`
   - Secret client

Si Google demande un écran de consentement :
- Type : **Externe**
- Nom app : KlirBuild
- Email support : ton email
- Scopes : `email`, `profile`, `openid`
- Utilisateurs test : ton Gmail (tant que l’app n’est pas « En production »)

## 2) Coller dans Cloudflare (pas dans le chat)

Workers → **klirbuild** → Settings → Variables and Secrets :

| Nom | Valeur |
|-----|--------|
| `GOOGLE_CLIENT_ID` | `….apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | secret Google |
| `NEXT_PUBLIC_APP_URL` | `https://klirline.app` (si pas déjà là) |

Ou en local :

```bash
printf '%s' 'VOTRE_CLIENT_ID.apps.googleusercontent.com' | npx wrangler secret put GOOGLE_CLIENT_ID
printf '%s' 'VOTRE_CLIENT_SECRET' | npx wrangler secret put GOOGLE_CLIENT_SECRET
```

## 3) Vérifier

```bash
curl -sS https://klirline.app/api/health | jq .checks.googleOAuth
```

Attendu : `{ "ok": true }`

Puis https://klirline.app/login → bouton **Continuer avec Google**.

## Note agent

Sans `GOOGLE_CLIENT_ID` / `SECRET` dans cet environnement, l’agent ne peut pas finir seul.  
Dès que tu as collé les secrets → dis **« oauth collé »**.
