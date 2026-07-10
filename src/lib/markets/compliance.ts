import type { CompliancePackId, MarketRegionId } from "@/lib/markets/regions";
import { getMarket } from "@/lib/markets/regions";

export type ComplianceItem = {
  id: string;
  pack: CompliancePackId;
  title: string;
  status: "ok" | "due_soon" | "overdue" | "action";
  dueDate?: string;
  owner: string;
  autoAction?: string;
};

export const complianceCatalog: Record<
  CompliancePackId,
  { name: string; description: string }
> = {
  ccq: {
    name: "CCQ (Québec)",
    description: "Cartes métier, heures apprentis, cotisations.",
  },
  osha: {
    name: "OSHA (USA)",
    description: "Safety toolbox talks, incident logs, PPE checks.",
  },
  lien_us: {
    name: "Mechanic's Lien (USA)",
    description: "Preliminary notices, lien deadlines, retainage releases.",
  },
  vat_caribbean: {
    name: "VAT / GCT / ITBIS / TCA",
    description: "Caribbean indirect tax filing calendar.",
  },
  hurricane: {
    name: "Hurricane & weather risk",
    description: "Seasonal site shutdown, crew alerts, delay change orders.",
  },
  work_permit: {
    name: "Work permits & crew mobility",
    description: "Island-to-island crew clearance tracking.",
  },
  t4: {
    name: "T4 / RL-1 (Canada)",
    description: "Year-end slips and remittances.",
  },
  w2_1099: {
    name: "W-2 / 1099 (USA)",
    description: "Employee vs contractor year-end forms.",
  },
};

export function complianceForRegion(regionId: MarketRegionId): ComplianceItem[] {
  const market = getMarket(regionId);
  const base: ComplianceItem[] = [];

  if (market.compliance.includes("ccq")) {
    base.push(
      {
        id: "ccq_1",
        pack: "ccq",
        title: "Carte CCQ — charpentier (expire)",
        status: "due_soon",
        dueDate: "2026-08-15",
        owner: "HR",
        autoAction: "Notifier employé + bloquer pointage hors conformité",
      },
      {
        id: "ccq_2",
        pack: "ccq",
        title: "Heures apprentis — rapport mensuel",
        status: "action",
        dueDate: "2026-07-31",
        owner: "Manager",
        autoAction: "Générer rapport CCQ depuis pointages",
      }
    );
  }

  if (market.compliance.includes("osha")) {
    base.push(
      {
        id: "osha_1",
        pack: "osha",
        title: "Weekly toolbox talk — fall protection",
        status: "action",
        dueDate: "2026-07-11",
        owner: "Site lead",
        autoAction: "Créer tâche + checklist PPE auto",
      },
      {
        id: "osha_2",
        pack: "osha",
        title: "OSHA 300 log — Q2 review",
        status: "ok",
        dueDate: "2026-07-15",
        owner: "Safety",
      }
    );
  }

  if (market.compliance.includes("lien_us")) {
    base.push({
      id: "lien_1",
      pack: "lien_us",
      title: "Preliminary notice — Job #FL-204",
      status: "due_soon",
      dueDate: "2026-07-20",
      owner: "Billing",
      autoAction: "Envoyer notice + joindre au dossier chantier",
    });
  }

  if (market.compliance.includes("vat_caribbean")) {
    base.push({
      id: "vat_1",
      pack: "vat_caribbean",
      title: `${market.taxLines[0]?.name ?? "VAT"} return — période courante`,
      status: "action",
      dueDate: "2026-07-28",
      owner: "Accounting",
      autoAction: "Préparer brouillon TVA depuis factures",
    });
  }

  if (market.compliance.includes("hurricane")) {
    base.push({
      id: "hur_1",
      pack: "hurricane",
      title: "Season readiness — site securing checklist",
      status: "due_soon",
      dueDate: "2026-07-15",
      owner: "Ops",
      autoAction: "Alerte SMS équipes + pause pointage si vent > seuil",
    });
  }

  if (market.compliance.includes("work_permit")) {
    base.push({
      id: "wp_1",
      pack: "work_permit",
      title: "Permis travail — 2 ouvriers (expire)",
      status: "overdue",
      dueDate: "2026-07-05",
      owner: "HR",
      autoAction: "Bloquer affectation chantier + notifier admin",
    });
  }

  if (market.compliance.includes("w2_1099")) {
    base.push({
      id: "w2_1",
      pack: "w2_1099",
      title: "1099 contractor classification audit",
      status: "action",
      dueDate: "2026-07-30",
      owner: "Payroll",
      autoAction: "Flag misclassified vendors from AP",
    });
  }

  if (market.compliance.includes("t4")) {
    base.push({
      id: "t4_1",
      pack: "t4",
      title: "Préparation T4 — année fiscale",
      status: "ok",
      dueDate: "2027-02-28",
      owner: "Payroll",
    });
  }

  return base;
}
