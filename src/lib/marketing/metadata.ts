import type { Metadata } from "next";

export const marketingMetadata: Metadata = {
  title: "KlirBuild — Construction OS par Klirline Inc.",
  description:
    "ERP chantier, CRM, estimés, CCQ et paiements pour PME construction en Amérique du Nord et aux Caraïbes. Demandez une démo.",
  alternates: {
    canonical: "/",
    languages: {
      "fr-CA": "/?lang=fr",
      "en-CA": "/?lang=en",
      "en-US": "/?lang=en",
    },
  },
  openGraph: {
    title: "KlirBuild — Construction OS",
    description:
      "Le système d’exploitation des chantiers. Klirline Inc. · Amérique du Nord & Caraïbes.",
    url: "https://www.klirline.app",
    siteName: "KlirBuild",
    locale: "fr_CA",
    alternateLocale: ["en_CA", "en_US"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KlirBuild — Construction OS",
    description:
      "ERP chantier + CRM + estimés + CCQ + paiements. Demandez une démo.",
  },
};

export const contactMetadata: Metadata = {
  title: "Réserver une démo — KlirBuild",
  description:
    "Demandez une démonstration de KlirBuild, le Construction OS de Klirline Inc.",
};
