export type TutorialStep = {
  time?: string;
  title: string;
  body: string;
  href?: string;
};

export type TutorialVideo = {
  /** ex. /help-videos/01-bienvenue-navigation.mp4 */
  src: string;
  /** Sous-titres WebVTT en français */
  captions?: string;
  /** Image d'aperçu JPG */
  poster?: string;
};

/** Construit les chemins /help-videos/<nom>.mp4|.fr.vtt|.jpg d'un tutoriel. */
export function helpVideo(name: string): TutorialVideo {
  return {
    src: `/help-videos/${name}.mp4`,
    captions: `/help-videos/${name}.fr.vtt`,
    poster: `/help-videos/${name}.jpg`,
  };
}

/** Vidéo à afficher : fichier hébergé dans l'app en priorité, sinon URL de secours. */
export function tutorialVideoUrl(t: Pick<Tutorial, "video" | "videoUrl">) {
  return t.video?.src ?? t.videoUrl?.trim() ?? "";
}

export type Tutorial = {
  slug: string;
  title: string;
  description: string;
  duration: string;
  category: "demarrage" | "metier" | "terrain" | "avance";
  order: number;
  /**
   * Vidéo hébergée dans l'app (bucket R2 `klirbuild-help-videos`, servi sur /help-videos/*).
   * Laisser absent tant que le fichier n'est pas en ligne.
   */
  video?: TutorialVideo;
  /** Secours : URL YouTube / Loom / Vimeo / MP4 fournie par variable d'environnement */
  videoUrl?: string;
  steps: TutorialStep[];
  relatedHrefs: string[];
};

/**
 * Tutoriels vidéo hébergés dans KlirBuild :
 * 1. Déposez <nom>.mp4, <nom>.fr.vtt et <nom>.jpg dans le bucket R2 `klirbuild-help-videos`
 *    (npx wrangler r2 object put klirbuild-help-videos/<fichier> --file=… --remote)
 * 2. Renseignez `video: helpVideo("<nom>")` sur le tutoriel ci-dessous
 * 3. Remplacer une vidéo existante (même nom) ne demande pas de redéploiement.
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
    video: helpVideo("01-bienvenue-navigation"),
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_1,
    relatedHrefs: ["/dashboard", "/ai"],
    steps: [
      {
        time: "0:00",
        title: "Connexion",
        body: "Connectez-vous avec votre courriel professionnel sur /login.",
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
    video: helpVideo("02-creer-entreprise"),
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_2,
    relatedHrefs: ["/register", "/settings"],
    steps: [
      {
        time: "0:00",
        title: "Inscription",
        body: "Sur /register, renseignez nom, courriel pro, nom d'entreprise et mot de passe. Cliquez sur « Commencer l'essai 14 jours ».",
        href: "/register",
      },
      {
        time: "1:00",
        title: "Paramètres entreprise",
        body: "Dans Paramètres → Company : nom affiché aux clients, courriel principal, téléphone, site web et numéro d'entreprise. Cliquez sur « Enregistrer l'entreprise ».",
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
    video: helpVideo("03-inviter-equipe-roles"),
    videoUrl: process.env.NEXT_PUBLIC_HELP_VIDEO_3,
    relatedHrefs: ["/settings", "/team-chat"],
    steps: [
      {
        time: "0:00",
        title: "Inviter un employé",
        body: "Paramètres → Users : entrez le courriel, choisissez un rôle, puis cliquez sur « Send invite ».",
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
    video: helpVideo("04-cycle-client-facturation"),
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
    video: helpVideo("05-gerer-chantiers"),
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
    video: helpVideo("06-terrain-pointage-chat"),
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
    video: helpVideo("08-ia-automatisations"),
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
    video: helpVideo("09-abonnement-plans"),
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
