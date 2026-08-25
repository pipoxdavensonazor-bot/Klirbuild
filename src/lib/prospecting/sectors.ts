/** Secteurs mappés vers Wikidata (P452 industrie), liste blanche uniquement. */

export type ProspectSectorId =
  | "all"
  | "retail"
  | "tech"
  | "construction"
  | "food"
  | "finance"
  | "health"
  | "education"
  | "agriculture"
  | "energy"
  | "transport"
  | "tourism"
  | "manufacturing"
  | "services";

export type ProspectSector = {
  id: ProspectSectorId;
  label: string;
  /** Q-id Wikidata industrie, absent pour « tous ». */
  wikidataId?: string;
};

export const PROSPECT_SECTORS: ProspectSector[] = [
  { id: "all", label: "Tous les secteurs" },
  { id: "retail", label: "Commerce / retail", wikidataId: "Q126793" },
  { id: "tech", label: "Technologie", wikidataId: "Q11661" },
  { id: "construction", label: "Construction", wikidataId: "Q385378" },
  { id: "food", label: "Agroalimentaire", wikidataId: "Q2095" },
  { id: "finance", label: "Finance", wikidataId: "Q43015" },
  { id: "health", label: "Santé", wikidataId: "Q31207" },
  { id: "education", label: "Éducation", wikidataId: "Q8434" },
  { id: "agriculture", label: "Agriculture", wikidataId: "Q11451" },
  { id: "energy", label: "Énergie", wikidataId: "Q134447" },
  { id: "transport", label: "Transport / logistique", wikidataId: "Q7590" },
  { id: "tourism", label: "Tourisme", wikidataId: "Q49389" },
  { id: "manufacturing", label: "Industrie", wikidataId: "Q187939" },
  { id: "services", label: "Services aux entreprises", wikidataId: "Q1227188" },
];

export function isProspectSector(value: string): value is ProspectSectorId {
  return PROSPECT_SECTORS.some((s) => s.id === value);
}

export function sectorById(id: ProspectSectorId): ProspectSector {
  return PROSPECT_SECTORS.find((s) => s.id === id) ?? PROSPECT_SECTORS[0]!;
}

export type ProspectFocus = "mix" | "startups" | "established";

export function isProspectFocus(value: string): value is ProspectFocus {
  return value === "mix" || value === "startups" || value === "established";
}
