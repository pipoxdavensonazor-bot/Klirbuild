export type TutorialStep = {
  time?: string;
  title: string;
  body: string;
  href?: string;
};

export type Tutorial = {
  slug: string;
  title: string;
  description: string;
  duration: string;
  category: "demarrage" | "metier" | "terrain" | "avance";
  order: number;
  /** YouTube, Loom, Vimeo ou URL MP4 — laisser vide tant que la vidéo n'est pas publiée */
  videoUrl?: string;
  steps: TutorialStep[];
  relatedHrefs: string[];
};

/**
 * Pour ajouter une vidéo générée (HeyGen, Synthesia, Loom, YouTube) :
 * 1. Publiez la vidéo sur YouTube (non listé) ou Loom
 * 2. Collez l'URL complète dans `videoUrl` ci-dessous
 * 3. Redéployez — le lecteur s'affiche automatiquement
 */
export const tutorials: Tutorial[] = [
  {
    slug: "bienvenue-navigation",
    title: "Bienvenue & navigation",
    description:
      "Découvrez le tableau de bord, la barre latérale, la recherche rapide et Klir AI.",
    duration: "4 min",
    category: "demarrage",
    order: 1,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_1,
    relatedHrefs: ["/dashboard", "/ai"],
    steps: [
      {
        time: "0:00",
        title: "Connexion",
        body: "Connectez-vous avec votre courriel professionnel sur /login. Compte démo : alex@klirline.demo / password.",
        href: "/login",
      },
      {
        time: "0:45",
        title: "Tableau de bord",
        body: "Le Dashboard affiche vos revenus du mois, factures ouvertes, projets actifs et actions rapides.",
        href: "/dashboard",
      },
      {
        time: "1:10",
        title: "Barre latérale",
        body: "À gauche : CRM, clients, devis, factures, chantiers, paie, chat d'équipe et plus.",
      },
      {
        time: "1:40",
        title: "Recherche rapide Ctrl+K",
        body: "Appuyez sur Ctrl+K (ou Cmd+K sur Mac) pour ouvrir la palette et naviguer instantanément.",
      },
      {
        time: "2:10",
        title: "Klir AI",
        body: "Le bouton flottant Klir AI est disponible partout pour poser des questions sur vos données.",
        href: "/ai",
      },
      {
        time: "2:40",
        title: "Marché, rôle et plan",
        body: "En haut de l'écran, simulez un marché (QC, US…), un rôle ou un plan pour voir ce que chaque employé verra.",
        href: "/markets",
      },
    ],
  },
  {
    slug: "creer-entreprise",
    title: "Créer votre entreprise",
    description:
      "Inscription, identité d'entreprise, branding et activation des modules.",
    duration: "5 min",
    category: "demarrage",
    order: 2,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_2,
    relatedHrefs: ["/register", "/settings"],
    steps: [
      {
        time: "0:00",
        title: "Inscription",
        body: "Sur /register, renseignez nom, courriel pro, nom d'entreprise et mot de passe. Cliquez sur Créer votre entreprise.",
        href: "/register",
      },
      {
        time: "1:00",
        title: "Paramètres entreprise",
        body: "Dans Settings → Company : nom légal, courriel de contact et fuseau horaire.",
        href: "/settings",
      },
      {
        time: "2:00",
        title: "Branding",
        body: "Settings → Branding : couleurs primaire et accent pour vos devis et factures.",
        href: "/settings",
      },
      {
        time: "2:40",
        title: "Modules",
        body: "Settings → Modules : Construction OS est activé par défaut. Activez d'autres secteurs si besoin.",
        href: "/settings",
      },
      {
        time: "3:20",
        title: "Marché",
        body: "Choisissez votre marché : taxes, devise et format de facture s'ajustent automatiquement.",
        href: "/markets",
      },
    ],
  },
  {
    slug: "inviter-equipe-roles",
    title: "Inviter l'équipe & rôles",
    description:
      "Invitations par courriel, acceptation et gestion des permissions par rôle.",
    duration: "6 min",
    category: "demarrage",
    order: 3,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_3,
    relatedHrefs: ["/settings", "/team-chat"],
    steps: [
      {
        time: "0:00",
        title: "Inviter un employé",
        body: "Settings → Users : entrez le courriel, choisissez un rôle, puis Envoyez l'invitation.",
        href: "/settings",
      },
      {
        time: "1:10",
        title: "Lien d'invitation",
        body: "Copiez le lien généré ou laissez KlirBuild envoyer le courriel automatiquement via Resend.",
      },
      {
        time: "1:50",
        title: "Accepter l'invitation",
        body: "L'invité ouvre le lien /invite, crée son mot de passe et rejoint l'équipe.",
      },
      {
        time: "2:30",
        title: "Comprendre les rôles",
        body: "Settings → Roles : chef de projet, ouvrier, comptable… Chaque rôle a des permissions distinctes.",
        href: "/settings",
      },
      {
        time: "3:20",
        title: "Simuler un rôle (compte démo)",
        body: "Sur un compte @klirline.demo, changez le rôle simulé dans la barre du haut : la navigation change selon le profil.",
      },
      {
        time: "4:10",
        title: "Chat d'équipe",
        body: "Tous les employés ont accès au Chat sécurisé pour communiquer sur les chantiers.",
        href: "/team-chat",
      },
    ],
  },
  {
    slug: "cycle-client-facturation",
    title: "Du CRM à la facture",
    description: "Pipeline commercial, devis, factures et encaissements.",
    duration: "10 min",
    category: "metier",
    order: 4,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_4,
    relatedHrefs: ["/crm", "/quotes", "/invoices", "/payments"],
    steps: [
      {
        title: "CRM & pipeline",
        body: "Gérez vos prospects et opportunités dans CRM et Pipeline.",
        href: "/crm",
      },
      {
        title: "Créer un devis",
        body: "Quotes ou Estimés construction : créez une soumission et envoyez-la au client.",
        href: "/quotes",
      },
      {
        title: "Facturer",
        body: "Convertissez ou créez une facture depuis Invoices.",
        href: "/invoices",
      },
      {
        title: "Encaisser",
        body: "Suivez les paiements et relances dans Payments.",
        href: "/payments",
      },
    ],
  },
  {
    slug: "gerer-chantiers",
    title: "Gérer les chantiers",
    description: "Projets, chantiers ERP, tâches et ordres de changement.",
    duration: "8 min",
    category: "metier",
    order: 5,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_5,
    relatedHrefs: ["/projects", "/construction/jobs", "/tasks"],
    steps: [
      {
        title: "Projets",
        body: "Vue Kanban des projets actifs, statuts et échéances.",
        href: "/projects",
      },
      {
        title: "Chantiers ERP",
        body: "Module Construction OS : chantiers, budgets et suivi terrain.",
        href: "/construction/jobs",
      },
      {
        title: "Tâches",
        body: "Assignez et suivez les tâches par chantier.",
        href: "/tasks",
      },
      {
        title: "Ordres de changement",
        body: "Documentez les extras et avenants avant facturation.",
        href: "/construction/change-orders",
      },
    ],
  },
  {
    slug: "terrain-pointage-chat",
    title: "Terrain : pointage & chat",
    description: "Chronomètre GPS, localisation et messagerie d'équipe.",
    duration: "5 min",
    category: "terrain",
    order: 6,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_6,
    relatedHrefs: ["/timeclock", "/locations", "/team-chat"],
    steps: [
      {
        title: "Chronomètre GPS",
        body: "Les employés pointent entrée/sortie avec géolocalisation.",
        href: "/timeclock",
      },
      {
        title: "Localisation",
        body: "Visualisez les équipes et chantiers sur la carte.",
        href: "/locations",
      },
      {
        title: "Chat sécurisé",
        body: "Canaux par équipe, rôles et pièces jointes (photos, PDF).",
        href: "/team-chat",
      },
    ],
  },
  {
    slug: "paie-conformite",
    title: "Paie & conformité",
    description: "Paie, rapports T4, comptabilité et CCQ.",
    duration: "6 min",
    category: "metier",
    order: 7,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_7,
    relatedHrefs: ["/payroll", "/reports/t4", "/accounting", "/construction/ccq"],
    steps: [
      { title: "Paie", body: "Heures, fiches de paie et masse salariale.", href: "/payroll" },
      { title: "Rapports T4", body: "Préparation fiscale T4 / W-2.", href: "/reports/t4" },
      { title: "Comptabilité", body: "Taxes, écritures et rapports financiers.", href: "/accounting" },
      { title: "CCQ", body: "Conformité construction Québec.", href: "/construction/ccq" },
    ],
  },
  {
    slug: "ia-automatisations",
    title: "IA & automatisations",
    description: "Klir AI, automatisations et Auto-Pilot.",
    duration: "5 min",
    category: "avance",
    order: 8,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_8,
    relatedHrefs: ["/ai", "/automations", "/auto-pilot"],
    steps: [
      { title: "Klir AI", body: "Assistant IA pour analyser vos données métier.", href: "/ai" },
      { title: "Automations", body: "Créez des flux automatiques (relances, alertes…).", href: "/automations" },
      { title: "Auto-Pilot", body: "Conversion automatique ordres de changement → factures.", href: "/auto-pilot" },
    ],
  },
  {
    slug: "abonnement-plans",
    title: "Abonnement & plans",
    description: "Plans Starter à Enterprise et gestion de la facturation.",
    duration: "3 min",
    category: "demarrage",
    order: 9,
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_9,
    relatedHrefs: ["/billing"],
    steps: [
      {
        title: "Comparer les plans",
        body: "Starter, Growth, Business et Enterprise débloquent des modules différents.",
        href: "/billing",
      },
      {
        title: "Fonctions verrouillées",
        body: "Les modules non inclus apparaissent dans Verrouillé et redirigent vers la facturation.",
        href: "/billing",
      },
      {
        title: "Gérer l'abonnement",
        body: "Les administrateurs peuvent modifier le plan via Stripe.",
        href: "/billing",
      },
    ],
  },
];

export const tutorialCategories: Record<
  Tutorial["category"],
  { label: string; description: string }
> = {
  demarrage: {
    label: "Premiers pas",
    description: "Démarrage, équipe et abonnement",
  },
  metier: {
    label: "Gestion métier",
    description: "CRM, chantiers, paie et conformité",
  },
  terrain: {
    label: "Terrain",
    description: "Pointage, localisation et communication",
  },
  avance: {
    label: "Avancé",
    description: "IA, automatisations et croissance",
  },
};

export function getTutorial(slug: string) {
  return tutorials.find((t) => t.slug === slug);
}

export function getTutorialsByCategory(category: Tutorial["category"]) {
  return tutorials.filter((t) => t.category === category).sort((a, b) => a.order - b.order);
}
