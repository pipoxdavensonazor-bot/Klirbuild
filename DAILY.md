# Daily.co (optionnel)

KlirBuild utilise déjà **Jitsi Meet** (gratuit) dès qu’il n’y a pas de clé Daily.  
Daily.co apporte : domaine custom, tokens propriétaires, enregistrement cloud.

## Free tier

1. Créer un compte : [https://dashboard.daily.co/signup](https://dashboard.daily.co/signup) (carte non requise)
2. Developers → copier l’**API key**
3. Noter le domaine (ex. `votre-domaine.daily.co`)

## Secrets Worker

```bash
printf '%s' "$DAILY_API_KEY" | npx wrangler secret put DAILY_API_KEY
# Domaine public (bake au build si utilisé côté client)
printf '%s' "votre-domaine.daily.co" | npx wrangler secret put NEXT_PUBLIC_DAILY_DOMAIN
npm run deploy
```

Sans ces secrets, `/meetings` et `/feed` restent en **Jitsi** — déjà live.

## Vérifier

```bash
curl -sS https://klirline.app/api/health | jq '.checks.dailyOrJitsi, .checks.daily'
```
