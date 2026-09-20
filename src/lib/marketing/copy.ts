export type MarketingLang = "fr" | "en";

export function resolveMarketingLang(raw: string | null | undefined): MarketingLang {
  return raw?.toLowerCase().startsWith("en") ? "en" : "fr";
}

export const marketingCopy = {
  fr: {
    htmlLang: "fr",
    navProduct: "Produit",
    navFeatures: "Fonctionnalités",
    navContact: "Contact",
    login: "Se connecter",
    signup: "Créer un compte",
    demo: "Réserver une démo",
    demoShort: "Demander une démo",
    langOther: "EN",
    langOtherLabel: "English",
    kicker: "Construction OS · Klirline Inc.",
    heroTitle: "Le système d’exploitation des chantiers.",
    heroBody:
      "ERP chantier, CRM, estimés, ordres de changement, CCQ et paiements — une plateforme pour entrepreneurs généraux, rénovateurs et chefs de projet.",
    trust: "Klirline Inc. · Amérique du Nord & Caraïbes",
    problemKicker: "Le problème",
    problemTitle: "Excel, WhatsApp et des classeurs ne tiennent plus un chantier.",
    problemBody:
      "Les PME construction perdent des marges entre l’estimé, le terrain, la facture et la conformité. KlirBuild relie chaque étape — du lead au holdback.",
    problems: [
      {
        title: "Devis déconnectés du réel",
        body: "L’estimé reste dans un fichier. Le chantier dérive. Personne ne voit la marge à temps.",
      },
      {
        title: "Changements sans trace",
        body: "Un extra verbal, une retenue oubliée, un client qui n’a jamais signé l’ordre de changement.",
      },
      {
        title: "Conformité CCQ fragmentée",
        body: "Heures, métiers, cartes de compétence — trop souvent dans un tableur à part.",
      },
    ],
    solutionKicker: "La solution",
    solutionTitle: "Estimer → vendre → exécuter → facturer → déclarer. Un seul OS.",
    solutionBody:
      "KlirBuild est le Construction OS de Klirline Inc. : ERP chantier, CRM, paiements et aide CCQ, avec une IA de chantier pour résumer, alerter et accélérer.",
    featuresKicker: "Fonctionnalités",
    featuresTitle: "Tout le cycle du chantier, sans coller cinq logiciels.",
    features: [
      {
        id: "chantiers",
        title: "Chantiers",
        body: "Jobs, budget vs réel, avancement, documents, planning et pointage GPS liés au chantier.",
      },
      {
        id: "estimates",
        title: "Estimés & extras",
        body: "Soumissions matériaux / main-d’œuvre / sous-traitance, puis ordres de changement avec approbation client.",
      },
      {
        id: "crm",
        title: "CRM construction",
        body: "Leads, pipeline d’appels d’offres, clients propriétaires ou GC, relances et historique par projet.",
      },
      {
        id: "ccq",
        title: "CCQ (Québec)",
        body: "Métiers, heures déclarables, cartes de compétence et alertes. Aide à la conformité — ne remplace pas les outils officiels CCQ.",
      },
      {
        id: "payments",
        title: "Paiements & retenues",
        body: "Facturation progressive, acomptes, holdback typique 10 %, historique de paiements chantier.",
      },
      {
        id: "ai",
        title: "IA chantier",
        body: "Résumé quotidien, aide à l’estimé, détection de dépassement, brouillon d’ordre de changement.",
      },
    ],
    audienceKicker: "Pour qui",
    audienceTitle: "Conçu pour les PME construction, pas pour les majeurs mondiaux.",
    audience: [
      "Entrepreneurs généraux",
      "Rénovateurs",
      "Chefs de projet / surintendants",
      "Québec, Canada, États-Unis & Caraïbes",
    ],
    ctaTitle: "Voyez KlirBuild sur vos chantiers.",
    ctaBody:
      "Pas de grilles tarifaires ici — on démarre par une démo adaptée à votre volume de jobs.",
    ctaPrimary: "Réserver une démo",
    ctaSecondary: "Se connecter",
    contactTitle: "Réserver une démo",
    contactBody:
      "Parlez-nous de votre entreprise. On vous revient pour une démonstration KlirBuild.",
    contactName: "Nom",
    contactEmail: "Courriel professionnel",
    contactCompany: "Entreprise",
    contactPhone: "Téléphone (optionnel)",
    contactMessage: "Message (optionnel)",
    contactSubmit: "Envoyer la demande",
    contactSending: "Envoi…",
    contactMailto: "Ou écrire à Contact@klirline.ca",
    contactSuccess: "Demande envoyée. Nous vous contactons sous peu.",
    contactMailtoOpened: "Votre client courriel s’est ouvert. Envoyez le message pour finaliser.",
    backHome: "Retour à l’accueil",
    legalCcq:
      "Le module CCQ est une aide à la conformité. Il ne remplace pas les outils ni les déclarations officielles de la Commission de la construction du Québec.",
  },
  en: {
    htmlLang: "en",
    navProduct: "Product",
    navFeatures: "Features",
    navContact: "Contact",
    login: "Log in",
    signup: "Create an account",
    demo: "Book a demo",
    demoShort: "Request a demo",
    langOther: "FR",
    langOtherLabel: "Français",
    kicker: "Construction OS · Klirline Inc.",
    heroTitle: "The operating system for the job site.",
    heroBody:
      "Job-site ERP, CRM, estimates, change orders, CCQ, and payments — built for general contractors, renovators, and project managers.",
    trust: "Klirline Inc. · North America & the Caribbean",
    problemKicker: "The problem",
    problemTitle: "Excel, WhatsApp, and binders cannot run a job.",
    problemBody:
      "Construction SMBs leak margin between estimate, field, invoice, and compliance. KlirBuild connects every step — from lead to holdback.",
    problems: [
      {
        title: "Estimates disconnected from reality",
        body: "The bid lives in a spreadsheet. The job drifts. Nobody sees margin in time.",
      },
      {
        title: "Changes without a paper trail",
        body: "A verbal extra, a missed holdback, a client who never signed the change order.",
      },
      {
        title: "Fragmented CCQ compliance",
        body: "Hours, trades, and competency cards too often live in a side spreadsheet.",
      },
    ],
    solutionKicker: "The solution",
    solutionTitle: "Estimate → sell → execute → invoice → report. One OS.",
    solutionBody:
      "KlirBuild is Klirline Inc.’s Construction OS: job ERP, CRM, payments, and CCQ assistance, plus site AI to summarize, alert, and speed the work.",
    featuresKicker: "Features",
    featuresTitle: "The full job cycle — without five disconnected tools.",
    features: [
      {
        id: "chantiers",
        title: "Jobs",
        body: "Jobs, budget vs actual, progress, documents, scheduling, and GPS timekeeping tied to the site.",
      },
      {
        id: "estimates",
        title: "Estimates & extras",
        body: "Material / labor / subcontractor bids, then change orders with client approval.",
      },
      {
        id: "crm",
        title: "Construction CRM",
        body: "Leads, bid pipeline, owner or GC clients, follow-ups, and project history.",
      },
      {
        id: "ccq",
        title: "CCQ (Québec)",
        body: "Trades, reportable hours, competency cards, and alerts. Compliance aid — not a replacement for official CCQ tools.",
      },
      {
        id: "payments",
        title: "Payments & holdback",
        body: "Progress billing, deposits, typical 10% holdback, and job payment history.",
      },
      {
        id: "ai",
        title: "Site AI",
        body: "Daily summary, estimating help, overrun detection, and change-order drafts.",
      },
    ],
    audienceKicker: "Who it’s for",
    audienceTitle: "Built for construction SMBs, not global majors.",
    audience: [
      "General contractors",
      "Renovators",
      "Project managers / superintendents",
      "Québec, Canada, the U.S. & the Caribbean",
    ],
    ctaTitle: "See KlirBuild on your jobs.",
    ctaBody: "No public price grid — we start with a demo sized to your job volume.",
    ctaPrimary: "Book a demo",
    ctaSecondary: "Log in",
    contactTitle: "Book a demo",
    contactBody: "Tell us about your company. We’ll follow up with a KlirBuild walkthrough.",
    contactName: "Name",
    contactEmail: "Work email",
    contactCompany: "Company",
    contactPhone: "Phone (optional)",
    contactMessage: "Message (optional)",
    contactSubmit: "Send request",
    contactSending: "Sending…",
    contactMailto: "Or email Contact@klirline.ca",
    contactSuccess: "Request sent. We’ll be in touch shortly.",
    contactMailtoOpened: "Your email app opened. Send the message to finish.",
    backHome: "Back to home",
    legalCcq:
      "The CCQ module is a compliance aid. It does not replace official Commission de la construction du Québec tools or filings.",
  },
} as const;
