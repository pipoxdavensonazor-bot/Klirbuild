import type { SocialPlatform } from "@/lib/reports/types";

export const KLIRLINE_MARKETING_HUB =
  process.env.KLIRLINE_MARKETING_HUB_URL?.replace(/\/$/, "") ??
  "https://www.klirline.ca";

export const KLIRLINE_MARKETING_CONTACT = "Contact@klirline.ca";

/** Profils officiels Klirline — référence partenaire marketing */
export const KLIRLINE_OFFICIAL_PROFILES: Partial<
  Record<SocialPlatform, { handle: string; url: string }>
> = {
  instagram: {
    handle: "@klirlineofficial",
    url: "https://www.instagram.com/klirlineofficial/",
  },
  facebook: {
    handle: "KlirlineOfficial",
    url: "https://www.facebook.com/people/KlirlineOfficial/61589921400915/",
  },
  linkedin: {
    handle: "Klirline Inc.",
    url: "https://www.linkedin.com/company/klirline-inc/",
  },
  tiktok: {
    handle: "@klirlineofficial",
    url: "https://www.tiktok.com/@klirlineofficial",
  },
  meta: {
    handle: "Meta Business — Klirline",
    url: "https://www.klirline.ca/",
  },
  google: {
    handle: "Google Ads — Klirline",
    url: "https://www.klirline.ca/",
  },
  youtube: {
    handle: "Klirline",
    url: "https://www.klirline.ca/",
  },
};

export function klirlineOAuthUrl(options: {
  companyId: string;
  companyName: string;
  platform: SocialPlatform;
  returnUrl: string;
}) {
  const params = new URLSearchParams({
    partner: "klirbuild",
    platform: options.platform,
    company_id: options.companyId,
    company_name: options.companyName,
    return_url: options.returnUrl,
  });
  return `${KLIRLINE_MARKETING_HUB}/marketing/connect?${params.toString()}`;
}

export function klirlineMarketingPortalUrl(companyId: string) {
  const params = new URLSearchParams({
    partner: "klirbuild",
    company_id: companyId,
  });
  return `${KLIRLINE_MARKETING_HUB}/marketing?${params.toString()}`;
}
