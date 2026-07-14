import type { LocaleCode } from "@/lib/markets/regions";

const dict = {
  en: {
    markets: "Markets",
    autoPilot: "Auto-Pilot",
    compliance: "Compliance",
    dashboard: "Dashboard",
    billing: "Subscription",
    settings: "Settings",
    clients: "Clients",
    quotes: "Quotes",
    invoices: "Invoices",
    projects: "Projects",
    timeclock: "Time clock",
    meetings: "Meetings",
    help: "Help",
    accounting: "Accounting",
    construction: "Construction OS",
    uniquePitch:
      "The only Construction OS built for Canada, the United States, and the Caribbean — taxes, compliance, currency, and weather automation in one cockpit.",
  },
  fr: {
    markets: "Marchés",
    autoPilot: "Auto-Pilot",
    compliance: "Conformité",
    dashboard: "Tableau de bord",
    billing: "Abonnement",
    settings: "Paramètres",
    clients: "Clients",
    quotes: "Soumissions",
    invoices: "Factures",
    projects: "Projets",
    timeclock: "Pointage",
    meetings: "Réunions",
    help: "Aide",
    accounting: "Comptabilité",
    construction: "Construction OS",
    uniquePitch:
      "Le seul OS construction conçu pour le Canada, les États-Unis et les Caraïbes — taxes, conformité, devises et automatisation météo dans un seul cockpit.",
  },
  es: {
    markets: "Mercados",
    autoPilot: "Auto-Pilot",
    compliance: "Cumplimiento",
    dashboard: "Panel",
    billing: "Suscripción",
    settings: "Ajustes",
    clients: "Clientes",
    quotes: "Cotizaciones",
    invoices: "Facturas",
    projects: "Proyectos",
    timeclock: "Fichaje",
    meetings: "Reuniones",
    help: "Ayuda",
    accounting: "Contabilidad",
    construction: "Construction OS",
    uniquePitch:
      "El único OS de construcción para Canadá, EE.UU. y el Caribe — impuestos, cumplimiento, divisas y automatización climática en un solo cockpit.",
  },
} as const;

export type UiKey = keyof (typeof dict)["en"];

export function t(locale: LocaleCode, key: UiKey) {
  return dict[locale][key] ?? dict.en[key];
}

export const localeLabels: Record<LocaleCode, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};
