import type { Role } from "@/types";

const MARKETING_TITLE_PATTERN =
  /marketing|chef\s*marketing|directeur\s*marketing|responsable\s*marketing/i;

/** Administrateur central ou rôles direction / marketing. */
export function canManageSocialAds(role: Role, jobTitle?: string) {
  if (role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "PROJECT_MANAGER") {
    return true;
  }
  if (role === "MANAGER" && jobTitle && MARKETING_TITLE_PATTERN.test(jobTitle)) {
    return true;
  }
  return false;
}

export function socialAdsAccessLabel(role: Role, jobTitle?: string) {
  if (canManageSocialAds(role, jobTitle)) {
    if (role === "MANAGER") return "Chef marketing";
    return "Administrateur central";
  }
  return null;
}
