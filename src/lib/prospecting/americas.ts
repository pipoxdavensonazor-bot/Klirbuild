/** Pays et territoires des Amériques (identifiants Wikidata P17). */

export type AmericasRegionId =
  | "americas"
  | "CA"
  | "US"
  | "HT"
  | "caribbean"
  | "latam";

export type AmericasCountry = {
  iso: string;
  label: string;
  wikidataId: string;
  group: "north" | "caribbean" | "latam";
  /** Boost Klirline.ca (Haïti, Caraïbes, Canada). */
  klirlineScore: number;
};

export const AMERICAS_COUNTRIES: AmericasCountry[] = [
  { iso: "US", label: "États-Unis", wikidataId: "Q30", group: "north", klirlineScore: 5 },
  { iso: "CA", label: "Canada", wikidataId: "Q16", group: "north", klirlineScore: 15 },
  { iso: "MX", label: "Mexique", wikidataId: "Q96", group: "latam", klirlineScore: 8 },
  { iso: "BR", label: "Brésil", wikidataId: "Q155", group: "latam", klirlineScore: 6 },
  { iso: "AR", label: "Argentine", wikidataId: "Q414", group: "latam", klirlineScore: 5 },
  { iso: "CL", label: "Chili", wikidataId: "Q298", group: "latam", klirlineScore: 5 },
  { iso: "CO", label: "Colombie", wikidataId: "Q739", group: "latam", klirlineScore: 6 },
  { iso: "PE", label: "Pérou", wikidataId: "Q419", group: "latam", klirlineScore: 5 },
  { iso: "VE", label: "Venezuela", wikidataId: "Q717", group: "latam", klirlineScore: 4 },
  { iso: "EC", label: "Équateur", wikidataId: "Q736", group: "latam", klirlineScore: 4 },
  { iso: "BO", label: "Bolivie", wikidataId: "Q750", group: "latam", klirlineScore: 4 },
  { iso: "PY", label: "Paraguay", wikidataId: "Q733", group: "latam", klirlineScore: 3 },
  { iso: "UY", label: "Uruguay", wikidataId: "Q77", group: "latam", klirlineScore: 4 },
  { iso: "GT", label: "Guatemala", wikidataId: "Q774", group: "latam", klirlineScore: 5 },
  { iso: "HN", label: "Honduras", wikidataId: "Q783", group: "latam", klirlineScore: 5 },
  { iso: "NI", label: "Nicaragua", wikidataId: "Q811", group: "latam", klirlineScore: 4 },
  { iso: "CR", label: "Costa Rica", wikidataId: "Q800", group: "latam", klirlineScore: 6 },
  { iso: "PA", label: "Panama", wikidataId: "Q804", group: "latam", klirlineScore: 6 },
  { iso: "SV", label: "Salvador", wikidataId: "Q792", group: "latam", klirlineScore: 5 },
  { iso: "HT", label: "Haïti", wikidataId: "Q790", group: "caribbean", klirlineScore: 30 },
  { iso: "DO", label: "République dominicaine", wikidataId: "Q786", group: "caribbean", klirlineScore: 18 },
  { iso: "CU", label: "Cuba", wikidataId: "Q241", group: "caribbean", klirlineScore: 10 },
  { iso: "JM", label: "Jamaïque", wikidataId: "Q766", group: "caribbean", klirlineScore: 12 },
  { iso: "PR", label: "Porto Rico", wikidataId: "Q1183", group: "caribbean", klirlineScore: 10 },
  { iso: "TT", label: "Trinité-et-Tobago", wikidataId: "Q754", group: "caribbean", klirlineScore: 8 },
  { iso: "BB", label: "Barbade", wikidataId: "Q244", group: "caribbean", klirlineScore: 8 },
  { iso: "BS", label: "Bahamas", wikidataId: "Q778", group: "caribbean", klirlineScore: 8 },
  { iso: "GP", label: "Guadeloupe", wikidataId: "Q17012", group: "caribbean", klirlineScore: 14 },
  { iso: "MQ", label: "Martinique", wikidataId: "Q17054", group: "caribbean", klirlineScore: 14 },
  { iso: "GF", label: "Guyane", wikidataId: "Q3769", group: "latam", klirlineScore: 10 },
];

export const AMERICAS_REGION_LABELS: Record<AmericasRegionId, string> = {
  americas: "Toutes les Amériques",
  CA: "Canada",
  US: "États-Unis",
  HT: "Haïti",
  caribbean: "Caraïbes",
  latam: "Amérique latine",
};

export function countriesForRegion(region: AmericasRegionId): AmericasCountry[] {
  if (region === "americas") return AMERICAS_COUNTRIES;
  if (region === "CA") return AMERICAS_COUNTRIES.filter((c) => c.iso === "CA");
  if (region === "US") return AMERICAS_COUNTRIES.filter((c) => c.iso === "US" || c.iso === "PR");
  if (region === "HT") return AMERICAS_COUNTRIES.filter((c) => c.iso === "HT");
  if (region === "caribbean") return AMERICAS_COUNTRIES.filter((c) => c.group === "caribbean");
  return AMERICAS_COUNTRIES.filter((c) => c.group === "latam");
}

export function isAmericasRegion(value: string): value is AmericasRegionId {
  return value in AMERICAS_REGION_LABELS;
}

export function countryScore(countryLabel: string | null | undefined): number {
  if (!countryLabel) return 0;
  const needle = countryLabel.toLowerCase();
  const match = AMERICAS_COUNTRIES.find(
    (c) =>
      c.label.toLowerCase() === needle ||
      needle.includes(c.label.toLowerCase()) ||
      c.label.toLowerCase().includes(needle)
  );
  return match?.klirlineScore ?? 0;
}
