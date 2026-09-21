# Postiz — alternative gratuite à Zernio

KlirBuild publie / connecte les réseaux via **Postiz** quand `POSTIZ_API_KEY` est défini (et que `ZERNIO_API_KEY` ne l’est pas).

## Pourquoi Postiz

- Open source, **self-host gratuit**
- OAuth Facebook, Instagram, TikTok, YouTube, …
- API publique pour connecter + publier

Docs : https://docs.postiz.com/public-api/introduction  
Repo : https://github.com/gitroomhq/postiz-app

## Setup rapide (self-host)

1. Déploie Postiz (Docker) — voir https://docs.postiz.com  
2. Crée les apps développeur Facebook / Google / TikTok dans Postiz (Settings → Providers)  
3. Génère une API key : **Settings → Developers → Public API**  
4. Sur le Worker KlirBuild :

```bash
printf '%s' 'VOTRE_CLE' | npx wrangler secret put POSTIZ_API_KEY
# Self-host (obligatoire si pas le cloud Postiz) :
printf '%s' 'https://postiz.votredomaine.com/api/public/v1' | npx wrangler secret put POSTIZ_API_BASE_URL
```

5. Redéploie KlirBuild, puis **Feed → Connecter** → OAuth réel du réseau.

## Priorité des providers

1. `ZERNIO_API_KEY` → Zernio  
2. sinon `POSTIZ_API_KEY` → Postiz  
3. sinon formulaire in-app (nom de page) + RTMP

## Note cloud Postiz

`https://api.postiz.com/public/v1` nécessite un plan cloud Postiz payant.  
Pour **0 $**, utilise le **self-host**.
