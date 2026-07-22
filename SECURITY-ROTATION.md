# Rotation des secrets exposés

Des clés ont circulé dans des sessions agent / chat. **À faire dans les dashboards** (ne pas renvoyer les nouvelles valeurs dans le chat).

| Secret | Où tourner | Après rotation |
|--------|------------|----------------|
| Cloudflare API token | dash.cloudflare.com → API Tokens | Mettre à jour env agent / CI `CLOUDFLARE_API_TOKEN` |
| Resend API key | resend.com → API Keys | `wrangler secret put RESEND_API_KEY` |
| OpenRouter API key | openrouter.ai → Keys | `wrangler secret put OPENROUTER_API_KEY` |
| Mot de passe DB Supabase `klirbuild` | Supabase → Database | Nouveau `DATABASE_URL` + `wrangler secret put DATABASE_URL` |
| `BETTER_AUTH_SECRET` | générer localement | `wrangler secret put BETTER_AUTH_SECRET` |
| Keystore Android | régénérer si exposé | Nouveau keystore + `keystore.properties` local (gitignoré) |

### Générer un secret auth

```bash
openssl rand -base64 32
```

### Vérifier après rotation

```bash
curl -sS https://klirline.app/api/health | jq '{status, summary, checks: .checks | with_entries(select(.value.ok==false))}'
```
