import type { KlirlineModule } from "@/modules/registry";

export type ModulePageContent = {
  tagline: string;
  features: string[];
  roadmap: string[];
  status: "available" | "preview" | "planned";
};

export const modulePageContent: Record<string, ModulePageContent> = {
  "cleaning-os": {
    tagline: "Planification d'équipes, routes et checklists pour entreprises de nettoyage.",
    features: [
      "Feuilles de route quotidiennes par équipe",
      "Checklists qualité par site",
      "Pointage mobile et géofencing",
      "Facturation récurrente par contrat",
    ],
    roadmap: ["Inventaire produits", "Portail client", "App mobile hors-ligne"],
    status: "preview",
  },
  "restaurant-os": {
    tagline: "Menus, shifts, fournisseurs et opérations quotidiennes pour restaurants.",
    features: [
      "Planning de shifts cuisine / salle",
      "Gestion fournisseurs et commandes",
      "Coûts matière vs ventes",
      "Checklists ouverture / fermeture",
    ],
    roadmap: ["POS intégré", "Réservations", "KDS cuisine"],
    status: "preview",
  },
  "medical-os": {
    tagline: "Cliniques, rendez-vous et workflows patients (non-DME).",
    features: [
      "Agenda praticiens",
      "Dossiers patients légers",
      "Rappels SMS / courriel",
      "Facturation RAMQ / privée",
    ],
    roadmap: ["Intégration EMR", "Télésanté", "Formulaires consentement"],
    status: "planned",
  },
  "retail-os": {
    tagline: "Inventaire multi-magasins et opérations retail.",
    features: [
      "Stock par emplacement",
      "Réapprovisionnement",
      "Promotions et marges",
      "Équipe et shifts",
    ],
    roadmap: ["Code-barres", "E-commerce sync", "Loyalty"],
    status: "planned",
  },
  "education-os": {
    tagline: "Programmes, cohortes et opérations pour écoles et centres de formation.",
    features: [
      "Inscriptions et cohortes",
      "Présences",
      "Facturation scolarité",
      "Communication parents",
    ],
    roadmap: ["LMS léger", "Évaluations", "Certificats"],
    status: "planned",
  },
  "legal-os": {
    tagline: "Dossiers, mandats et facturation pour cabinets juridiques.",
    features: [
      "Dossiers par client",
      "Suivi des heures",
      "Facturation au temps",
      "Échéancier tribunal",
    ],
    roadmap: ["Gestion conflits", "Portail client sécurisé", "Modèles de actes"],
    status: "planned",
  },
  "manufacturing-os": {
    tagline: "Ordres de fabrication, nomenclatures et suivi atelier.",
    features: [
      "Ordres de travail",
      "Nomenclatures (BOM)",
      "Suivi production",
      "Contrôle qualité",
    ],
    roadmap: ["MES léger", "Maintenance préventive", "Traçabilité lots"],
    status: "planned",
  },
};

export function getModulePageContent(mod: KlirlineModule): ModulePageContent {
  return (
    modulePageContent[mod.id] ?? {
      tagline: mod.description,
      features: ["Tableau de bord vertical", "Permissions dédiées", "Intégration Klirline core"],
      roadmap: ["Routes métier", "Widgets dashboard", "Automations sectorielles"],
      status: mod.id === "construction-os" ? "available" : "preview",
    }
  );
}
