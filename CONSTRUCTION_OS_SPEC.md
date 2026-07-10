# Klirline Construction OS — Cahier des charges PME Canada

Logiciel de construction pour PME canadiennes : **ERP + CRM + IA + CCQ + Paiements + Marketing**.

## Vision

Une plateforme unique pour entrepreneurs généraux, sous-traitants et rénovateurs au Québec / Canada :
estimer → vendre → planifier → exécuter → pointer (GPS) → facturer → payer → déclarer CCQ → analyser.

## Piliers

### 1. ERP Chantier
- Chantiers / jobs (budget, coûts, marge, % avancement)
- Estimés & soumissions (lignes matériaux / main-d'œuvre / sous-traitance)
- Ordres de changement (change orders) avec approbation client
- Job costing (réel vs budget)
- Matériaux, bons de commande, fournisseurs
- Équipements & location
- Planning Gantt / jalons
- Documents chantier (plans, permis, photos)
- Pointage GPS (Core) lié au chantier

### 2. CRM Construction
- Leads & pipeline soumissions
- Clients propriétaires / promoteurs / GC
- Contacts chantier (surintendant, architecte)
- Suivi appels d'offres
- Historique projets par client
- Relances automatiques

### 3. CCQ (Québec) — conformité
- Métiers CCQ / annexes
- Heures déclarables par métier
- Statut carte compétence / apprenti / compagnon
- Suivi formation obligatoire
- Rapport heures pour déclaration
- Alertes conformité (carte expirée, ratio apprenti)
- *Note légale : module d'aide à la conformité — ne remplace pas les outils officiels CCQ*

### 4. Paiements
- Facturation progressive (progress billing / % completion)
- Acomptes & retenues de garantie (holdback 10% typique)
- Stripe Checkout / Interac stub
- Historique paiements chantier
- Lien paie employés (Core payroll)

### 5. Marketing PME
- Campagnes (Google Ads / Meta / local SEO stubs)
- Capture leads web → CRM
- Modèles d'emails / SMS
- Avis Google / réputation
- Calendrier contenu
- ROI marketing vs contrats signés

### 6. IA Construction
- Résumé chantier quotidien
- Aide à l'estimé (prix unitaires)
- Détection dépassement budget
- Brouillon ordre de changement
- Checklist sécurité / toolbox talk
- Réponse lead commerciale

## Rôles (accès limité)
| Rôle | Accès typique |
|------|----------------|
| COMPANY_ADMIN | Tout Construction OS |
| MANAGER | Chantiers, CCQ lecture, CRM, paiements lecture |
| EMPLOYEE | Pointage, chat, son chantier assigné, docs lecture |

## Stack
Next.js 15 · Prisma · Core Klirline (auth, paie, GPS, chat, compta TPS/TVQ)

## Routes MVP livrées
`/construction` — Hub  
`/construction/jobs` — ERP chantiers  
`/construction/estimates` — Estimés  
`/construction/change-orders` — Ordres de changement  
`/construction/crm` — CRM construction  
`/construction/ccq` — Conformité CCQ  
`/construction/payments` — Paiements / retenues  
`/construction/marketing` — Marketing PME  
`/construction/ai` — IA chantier  
