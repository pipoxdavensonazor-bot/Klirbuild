# Play Console — pack de remplissage KlirBuild

Package : `app.klirline.klirbuild`  
Développeur : **Klirline Inc.**  
Site : https://klirline.app  
Support : **Contact@klirline.ca**  
Confidentialité : **https://klirline.app/privacy**  
Conditions : https://klirline.app/terms

**État réel (2026-09-06)** : **3 / 11** tâches setup faites (politique de confidentialité, détails de connexion, pubs).  
**Bloqué** : tests fermés tant que le setup n’est pas terminé.  
**Production** : après tests fermés → **12 testeurs × 14 jours** minimum, puis demande d’accès prod.  
**Ne pas** prétendre que l’app est « en revue » ou en production.

Réponses ci-dessous = valeurs exactes à cliquer / coller. Pas de Play Billing : abonnements **Stripe + MonCash sur le web**.

---

## Déjà fait (ne pas refaire)

| Tâche | Statut |
|-------|--------|
| Politique de confidentialité | ✅ URL : `https://klirline.app/privacy` |
| Détails de connexion (sign-in) | ✅ |
| Déclaration pubs (Ads) | ✅ |

---

## 1. Classification du contenu (Content rating)

Play Console → **Contenu de l’app** → **Classification du contenu** → questionnaire IARC.

| Question (FR approx.) | Réponse |
|------------------------|---------|
| Catégorie / type d’app | **Productivité / Affaires** (pas jeu) |
| Violence | **Non** |
| Contenu sexuel | **Non** |
| Langage grossier | **Non** |
| Substances contrôlées | **Non** |
| Armes / terreur | **Non** |
| Contenu généré par les utilisateurs | **Oui** (chat, feed, photos chantier) — modération / signalement côté produit |
| Partage de position avec d’autres utilisateurs | **Oui** (pointage / présence équipe) |
| Achats dans l’app (Play Billing) | **Non** (paiements hors Play, via web) |
| Loot boxes / objets aléatoires | **Non** |
| Contenu destiné aux enfants | **Non** |
| Navigateur web générique / moteur de recherche | **Non** (webview de klirline.app uniquement) |
| Actualités / contenu éducatif grand public | **Non** |

Soumettre le questionnaire → attendre l’email IARC → **Appliquer** la classification.

---

## 2. Public cible (Target audience)

Play Console → **Public cible et contenu**.

| Champ | Valeur |
|-------|--------|
| Tranches d’âge cibles | **18 et plus uniquement** |
| App conçue pour les enfants | **Non** |
| Attractivité pour enfants | **Non** (B2B construction) |
| Programme Designed for Families / Families | **Non** / ne pas rejoindre |
| Store listing adapté enfants | **Non** |

---

## 3. Sécurité des données (Data safety)

Play Console → **Sécurité des données**. Formulaire honnête pour ERP construction B2B (shell Android + webview `https://klirline.app`).

### Vue d’ensemble

| Question | Réponse |
|----------|---------|
| L’app collecte des données utilisateur ? | **Oui** |
| Données chiffrées en transit ? | **Oui** (TLS / HTTPS) |
| Les utilisateurs peuvent demander la suppression ? | **Oui** → Contact@klirline.ca / compte |
| Lien politique de confidentialité | **https://klirline.app/privacy** |
| L’app suit les utilisateurs / cookies pub ? | **Non** (pas de tracking pub dans le shell) |
| Engagement de sécurité indépendant | **Non** (sauf si audit fourni) |

### Types de données — Collectée / Partagée / Obligatoire / Usages

Usages typiques Play : **Fonctionnalité de l’app**, **Gestion du compte**, **Sécurité / prévention de fraude**, **Assistance client**.  
« Partagée » = transmise à un tiers pour traitement (Stripe, hébergeur, etc.), pas « vendue ».

| Donnée Play | Collectée | Partagée | Obligatoire | Usages principaux | Notes |
|-------------|-----------|----------|-------------|-------------------|-------|
| Nom | Oui | Non* | Oui (compte) | Compte, support | *traitants sous contrat OK |
| Adresse e-mail | Oui | Non* | Oui | Compte, support | |
| Identifiants utilisateur | Oui | Non* | Oui | Compte, sécurité | ID session / société |
| Adresse postale | Oui (si saisie facturation / client) | Non* | Non | Fonction app | Données métier CRM |
| N° de téléphone | Oui (si saisi) | Non* | Non | Compte / app | |
| Infos de paiement | **Non stockées** sur KlirBuild | **Oui → Stripe / MonCash** | Non (web) | Achats abonnement | Cartes chez Stripe ; MonCash pour HT |
| Historique d’achat | Oui (abonnement) | Stripe | Non | Fonction app | Plans SaaS |
| Photos / vidéos | Oui | Non* | Non | Fonction app | Chantier, réunions |
| Fichiers / docs | Oui | Non* | Non | Fonction app | Devis, PDF |
| Fichiers audio | Oui | Non* | Non | Fonction app | Réunions (cam/mic) |
| Position approximative | Oui | Non* | Non | Fonction app | Pointage / présence |
| Position précise | Oui | Non* | Non | Fonction app | Pointage GPS |
| Interactions dans l’app | Oui | Non* | Non | Fonction app, analytics produit | |
| Journaux de plantage / diagnostics | Oui (si activés) | Non* | Non | Stabilité | |
| Identifiants d’appareil | Oui | Non* | Non | Auth / sécurité | |

\* Pas de « vente » de données. Partage limité aux prestataires nécessaires (Stripe, MonCash, hébergement Cloudflare, Daily/Jitsi pour visio).

### Épimers / éphemeral

Pas de données purement éphémères à déclarer au-delà des sessions temps réel (visio).

---

## 4. Applications gouvernementales (Government apps)

| Question | Réponse |
|----------|---------|
| L’app est-elle une app gouvernementale ? | **Non** |
| Publiée par / pour une agence gouvernementale ? | **Non** |

---

## 5. Fonctionnalités financières (Financial features)

| Question | Réponse exacte |
|----------|----------------|
| L’app fournit-elle des fonctionnalités financières ? | **Oui — paiements / achats numériques hors Play** |
| Banque / établissement de crédit / émetteur de carte | **Non** |
| Portefeuille crypto / trading | **Non** |
| Prêts / crédit / scoring | **Non** |
| Transferts d’argent P2P / remises | **Non** (MonCash = moyen de paiement abonnement, pas un service bancaire Klirline) |
| Google Play Billing utilisé for digital goods? | **Non** |
| Quoi déclarer | Abonnements SaaS payés sur **klirline.app** via **Stripe** et **MonCash** (web). L’APK Android n’intègre **pas** de facturation Google Play. |

Texte libre éventuel :

> KlirBuild est un logiciel SaaS construction. Les abonnements sont payés sur le site web (Stripe, MonCash). Pas de Play Billing, pas de services bancaires.

---

## 6. Santé (Health)

| Question | Réponse |
|----------|---------|
| Fonctionnalités santé / fitness / dispositifs médicaux | **Non** |
| Données de santé collectées | **Non** |

---

## 7. Catégorie + coordonnées (App category & contact)

Play Console → **Paramètres de la fiche Play Store** / **Catégorie et coordonnées**.

| Champ | Valeur |
|-------|--------|
| Catégorie d’app | **Affaires** (Business). Si indispo : **Productivité** |
| Tags (facultatif) | construction, devis, factures, chantier, PME |
| Adresse e-mail | **Contact@klirline.ca** |
| Numéro de téléphone | laisser vide sauf numéro officiel Klirline |
| Site web | **https://klirline.app** |
| Politique de confidentialité | **https://klirline.app/privacy** |

---

## 8. Fiche Play Store (Store listing) — fr-FR

Coller depuis `play/listing/fr-FR/` **ou** lancer l’API (section suivante).

### Textes (fichiers source)

| Champ | Fichier | Contenu actuel |
|-------|---------|----------------|
| Titre (≤ 30) | `play/listing/fr-FR/title.txt` | `KlirBuild` |
| Description courte (≤ 80) | `play/listing/fr-FR/short_description.txt` | `OS construction pour PME — chantiers, équipes, devis, paie et suivi.` |
| Description complète | `play/listing/fr-FR/full_description.txt` | (voir fichier) |

Variante marketing plus longue (optionnelle, déjà dans [PLAY-STORE-LISTING.md](./PLAY-STORE-LISTING.md)) — préférer les fichiers `play/listing/fr-FR/` pour rester aligné avec le script API.

### Graphiques (chemins locaux + URLs publiques)

| Asset | Local | URL publique |
|-------|-------|--------------|
| Icône 512×512 | `play/listing/graphics/icon.png` (= `public/downloads/play/icon-512.png`) | https://klirline.app/downloads/play/icon-512.png |
| Bannière 1024×500 | `play/listing/graphics/featureGraphic.png` | https://klirline.app/downloads/play/feature-graphic.png |
| Captures téléphone | `public/downloads/play/screenshots/01-…08-….jpg` | https://klirline.app/downloads/play/screenshots/01-tableau-de-bord.jpg … `08-acces-par-plan.jpg` |

Ordre captures (1 → 8) : tableau de bord, menu modules, feed live, réunions, team chat, plans starter/growth, plans business/enterprise, accès par plan.

### Upload API (si SA JSON disponible)

```bash
export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$(cat ./play-sa.json)"
# ou : export GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=./play-sa.json
npm run play:listing
```

Le script pousse **titre + descriptions fr-FR + icône + feature graphic**.  
Les **captures**, questionnaires (rating, audience, data safety, gov, finance, health) et **tests fermés** restent manuels.

---

## Après les 8 tâches

1. Vérifier setup **11/11** (ou « prêt pour tests »).
2. Créer une version **tests fermés** (closed) + AAB :  
   `public/downloads/KlirBuild-release.aab` ou `npm run play:publish` avec SA.
3. Inviter testeurs ; pour **production** : ≥ **12 testeurs** pendant **14 jours** en closed, puis demande d’accès prod.
4. Ne pas publier en production tant que Play n’a pas validé les prérequis.

---

## Ce que l’API ne fait pas (humain / agent navigateur)

- Classification contenu IARC + application
- Public cible / Families
- Data safety (formulaire)
- Government / Financial / Health
- Catégorie + e-mail contact (souvent hors `edits.listings`)
- Captures d’écran (le script listing n’uploade que icon + feature graphic)
- Création de la piste tests fermés + liste de testeurs
- Accès production / revue Google
