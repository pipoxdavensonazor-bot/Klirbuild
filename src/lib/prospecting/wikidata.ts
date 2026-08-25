import { countriesForRegion, type AmericasRegionId } from "@/lib/prospecting/americas";
import { parsePublicHttpUrl } from "@/lib/prospecting/public-url";
import { sectorById, type ProspectFocus, type ProspectSectorId } from "@/lib/prospecting/sectors";
import type { DiscoveredCompany } from "@/lib/prospecting/types";
import { PROSPECT_USER_AGENT } from "@/lib/prospecting/website-email";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const STARTUP_SINCE = "2023-01-01T00:00:00Z";

function inceptionFilter(focus: ProspectFocus): string {
  if (focus === "startups") {
    return `FILTER(BOUND(?inception) && ?inception >= "${STARTUP_SINCE}"^^xsd:dateTime)`;
  }
  if (focus === "established") {
    return `FILTER(!BOUND(?inception) || ?inception < "${STARTUP_SINCE}"^^xsd:dateTime)`;
  }
  return "";
}

function orderClause(focus: ProspectFocus): string {
  if (focus === "established") return "ORDER BY ?companyLabel";
  return "ORDER BY DESC(?inception)";
}

export function buildWikidataQuery(input: {
  region: AmericasRegionId;
  sector: ProspectSectorId;
  focus: ProspectFocus;
  limit: number;
}): string {
  const countries = countriesForRegion(input.region)
    .map((c) => `wd:${c.wikidataId}`)
    .join(" ");
  const sector = sectorById(input.sector);
  const industryLine = sector.wikidataId
    ? `?company wdt:P452/wdt:P279* wd:${sector.wikidataId} .`
    : "OPTIONAL { ?company wdt:P452 ?industry . }";
  const limit = Math.min(Math.max(input.limit, 1), 30);

  return `SELECT DISTINCT ?company ?companyLabel ?website ?countryLabel ?industryLabel ?inception WHERE {
  ?company wdt:P31/wdt:P279* wd:Q4830453 .
  ?company wdt:P856 ?website .
  ?company wdt:P17 ?country .
  VALUES ?country { ${countries} }
  ${industryLine}
  OPTIONAL { ?company wdt:P571 ?inception . }
  ${inceptionFilter(input.focus)}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
${orderClause(input.focus)}
LIMIT ${limit}`;
}

type WikidataBinding = {
  companyLabel?: { value?: string };
  website?: { value?: string };
  countryLabel?: { value?: string };
  industryLabel?: { value?: string };
  inception?: { value?: string };
};

export async function discoverWikidataCompanies(input: {
  region: AmericasRegionId;
  sector: ProspectSectorId;
  focus: ProspectFocus;
  limit: number;
}): Promise<DiscoveredCompany[]> {
  const query = buildWikidataQuery(input);
  const url = new URL(WIKIDATA_SPARQL);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");

  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": PROSPECT_USER_AGENT,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: { bindings?: WikidataBinding[] } };
  const bindings = json.results?.bindings ?? [];
  const out: DiscoveredCompany[] = [];
  for (const row of bindings) {
    const name = row.companyLabel?.value?.trim();
    const website = row.website?.value ? parsePublicHttpUrl(row.website.value) : null;
    if (!name || !website) continue;
    out.push({
      name,
      website: website.href,
      country: row.countryLabel?.value ?? null,
      sector: row.industryLabel?.value ?? sectorById(input.sector).label,
      source: "Wikidata",
      sourceUrl: website.href,
      inception: row.inception?.value ?? null,
    });
  }
  return out;
}
