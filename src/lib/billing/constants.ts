export const DEMO_COMPANY_ID = "demo_klirbuild";

/** Entreprise « holding » pour le compte admin plateforme Klirline Inc. */
export const PLATFORM_COMPANY_ID = "klirline_platform";

export const PLATFORM_ADMIN_EMAIL =
  process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() ||
  "admin@klirline.ca";
