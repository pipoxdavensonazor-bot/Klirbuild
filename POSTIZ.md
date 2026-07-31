# Postiz — backend invisible pour les entreprises

Les entreprises **ne voient jamais Postiz**. Elles cliquent seulement dans KlirBuild (Feed / Live) pour connecter une page et publier.

Postiz tourne en self-host (Railway) et sert uniquement d’API OAuth + publication.

## Ce que voit l’entreprise

1. Ouvre un live dans KlirBuild  
2. Clique **Facebook / Instagram / TikTok / YouTube**  
3. Autorise sa page dans la fenêtre OAuth du réseau  
4. KlirBuild publie l’annonce du live automatiquement  

Aucun compte Postiz, aucune sync manuelle, aucun dashboard tiers.

## Setup admin (une seule fois)

### 1. Postiz self-host

Déjà déployé sur Railway (template Postiz v2.11).  
Secrets KlirBuild :

```bash
printf '%s' 'VOTRE_CLE' | npx wrangler secret put POSTIZ_API_KEY
printf '%s' 'https://postiz-xxx.up.railway.app/api/public/v1' | npx wrangler secret put POSTIZ_API_BASE_URL
```

### 2. Apps développeur (admin KlirBuild, pas les clients)

Sur le service Railway **Postiz**, ajoute les variables puis redéploie :

| Réseau | Variables |
|--------|-----------|
| Facebook / Instagram | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` |
| TikTok | `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET` |

Redirect URIs à déclarer chez Meta / Google / TikTok (domaine Postiz) :

- `https://VOTRE-POSTIZ/integrations/social/facebook`
- `https://VOTRE-POSTIZ/integrations/social/instagram`
- `https://VOTRE-POSTIZ/integrations/social/youtube`
- `https://VOTRE-POSTIZ/integrations/social/tiktok`

Docs : https://docs.postiz.com/providers/overview

Sans ces clés, le bouton « Connecter » dans KlirBuild ne peut pas ouvrir OAuth.

## Priorité des providers

1. `ZERNIO_API_KEY` → Zernio  
2. sinon `POSTIZ_API_KEY` → Postiz (recommandé, gratuit self-host)  
3. sinon formulaire in-app (nom de page seulement, pas de vraie publication)

## Note

`https://api.postiz.com/public/v1` = cloud Postiz payant.  
Pour **0 $**, garder le self-host Railway.
