import type { MarketRegionId } from "@/lib/markets/regions";
import { getMarket } from "@/lib/markets/regions";

export type AutoRecipe = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  zones: Array<"canada" | "united_states" | "caribbean" | "all">;
  category: "billing" | "workforce" | "compliance" | "ops" | "finance";
  advanced: boolean;
  defaultOn: boolean;
};

export const autoRecipes: AutoRecipe[] = [
  {
    id: "auto_geofence_payslip",
    name: "Pointage GPS → brouillon paie",
    description:
      "Chaque semaine, convertit les heures géofencées en brouillon de paie avec OT auto.",
    trigger: "Dimanche 18:00 (fuseau entreprise)",
    actions: [
      "Agréger time entries validées",
      "Appliquer règles OT du régime local",
      "Créer payslip draft + notifier manager",
    ],
    zones: ["all"],
    category: "workforce",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_co_invoice",
    name: "Ordre de changement approuvé → facture",
    description:
      "Dès qu'un CO est signé, génère une ligne de facturation progress + taxes marché.",
    trigger: "Change order status = approved",
    actions: [
      "Créer invoice line item",
      "Appliquer taxes du profil marché",
      "Notifier client + compta",
    ],
    zones: ["all"],
    category: "billing",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_overdue_dunning",
    name: "Relance intelligente factures",
    description:
      "J+3 / J+7 / J+14 avec ton adapté (EN/FR/ES) et escalade manager.",
    trigger: "Invoice overdue",
    actions: ["Email J+3", "SMS/WhatsApp J+7", "Escalade + pause travaux J+14"],
    zones: ["all"],
    category: "finance",
    advanced: false,
    defaultOn: true,
  },
  {
    id: "auto_ccq_expiry",
    name: "Alerte expiration CCQ",
    description: "Bloque le pointage si carte CCQ expirée.",
    trigger: "CCQ card expires in ≤ 14 days",
    actions: ["Notifier employé", "Tâche HR", "Gate timeclock"],
    zones: ["canada"],
    category: "compliance",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_osha_toolbox",
    name: "Toolbox talk OSHA hebdo",
    description: "Crée checklist sécurité + preuve de présence équipe.",
    trigger: "Chaque lundi 07:00",
    actions: ["Créer tâche site", "Checklist PPE", "Log OSHA 300 ready"],
    zones: ["united_states"],
    category: "compliance",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_lien_notice",
    name: "Preliminary notice / lien clock",
    description: "Calcule les délais de lien US et envoie les notices.",
    trigger: "Job started OR first delivery",
    actions: ["Calendar lien deadlines", "Draft preliminary notice", "Alert billing"],
    zones: ["united_states"],
    category: "compliance",
    advanced: true,
    defaultOn: false,
  },
  {
    id: "auto_vat_draft",
    name: "Brouillon TVA / GCT / ITBIS / TCA",
    description: "Agrège les factures du mois et prépare le retour fiscal.",
    trigger: "J-5 avant échéance fiscale",
    actions: ["Somme taxable", "Export CSV", "Tâche accounting"],
    zones: ["caribbean"],
    category: "finance",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_hurricane",
    name: "Protocole ouragan Auto-Pilot",
    description:
      "Sur alerte météo : sécurisation, pause livraisons, CO weather delay, SMS équipes.",
    trigger: "Weather risk ≥ high",
    actions: [
      "Pause non-critical deliveries",
      "Assign secure-site checklist",
      "Draft weather delay change order",
      "Broadcast team-chat alert",
    ],
    zones: ["caribbean", "united_states"],
    category: "ops",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_fx_books",
    name: "Double livre multi-devises",
    description:
      "Tient le grand livre en devise locale + USD de reporting pour groupes multi-îles.",
    trigger: "Chaque écriture comptable",
    actions: ["Convertir via FX du jour", "Poster dual ledger", "Écart de change"],
    zones: ["caribbean", "united_states", "canada"],
    category: "finance",
    advanced: true,
    defaultOn: false,
  },
  {
    id: "auto_retainage_release",
    name: "Libération retenue / retainage",
    description:
      "Quand le % d'avancement atteint le seuil, propose la release de holdback.",
    trigger: "Job progress ≥ 95% OR substantial completion",
    actions: ["Calculer retainage dû", "Draft credit/release invoice", "Notify AP"],
    zones: ["all"],
    category: "billing",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_crew_permit",
    name: "Gate permis de travail",
    description: "Empêche l'affectation chantier si permis île expiré.",
    trigger: "Assign employee to job site",
    actions: ["Vérifier permis", "Bloquer si expiré", "Créer tâche renouvellement"],
    zones: ["caribbean"],
    category: "workforce",
    advanced: true,
    defaultOn: true,
  },
  {
    id: "auto_ai_cost_overrun",
    name: "IA dépassement budget",
    description: "Si coût réel > 8% du budget, alerte + suggestions CO / value eng.",
    trigger: "Daily job cost rollup",
    actions: ["Score risque", "Suggestions IA", "Ping PM"],
    zones: ["all"],
    category: "ops",
    advanced: true,
    defaultOn: true,
  },
];

export function recipesForRegion(regionId: MarketRegionId) {
  const zone = getMarket(regionId).zone;
  return autoRecipes.filter(
    (r) => r.zones.includes("all") || r.zones.includes(zone)
  );
}
