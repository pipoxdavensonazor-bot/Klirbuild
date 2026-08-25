import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";
import { upsertLead } from "@/lib/crm/crm-service";
import {
  AMERICAS_REGION_LABELS,
  countryScore,
} from "@/lib/prospecting/americas";
import { discoverEdgarFormD } from "@/lib/prospecting/edgar";
import {
  isBusinessLocalPart,
  pickBestEmail,
} from "@/lib/prospecting/extract-public-email";
import { originKey, parsePublicHttpUrl } from "@/lib/prospecting/public-url";
import type { ScanInput } from "@/lib/prospecting/parse-input";
import { PROSPECT_SECTORS, sectorById } from "@/lib/prospecting/sectors";
import type {
  DiscoveredCompany,
  ProspectHitDto,
  ProspectScanDto,
} from "@/lib/prospecting/types";
import { emailsFromOfficialSite } from "@/lib/prospecting/website-email";
import { discoverWikidataCompanies } from "@/lib/prospecting/wikidata";

const MAX_ENRICH = 8;
const MAX_EXTRA_SITES = 5;
const MAX_DISCOVER = 20;

export type { ScanInput };

function mapHit(row: {
  id: string;
  name: string;
  website: string | null;
  email: string | null;
  country: string | null;
  sector: string | null;
  source: string;
  sourceUrl: string | null;
  notes: string | null;
  score: number;
  importedLeadId: string | null;
  createdAt: Date;
}): ProspectHitDto {
  return {
    id: row.id,
    name: row.name,
    website: row.website ?? "",
    email: row.email ?? "",
    country: row.country ?? "",
    sector: row.sector ?? "",
    source: row.source,
    sourceUrl: row.sourceUrl ?? "",
    notes: row.notes ?? "",
    score: row.score,
    importedLeadId: row.importedLeadId ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

function mapScan(
  row: {
    id: string;
    region: string;
    sector: string;
    focus: string;
    status: string;
    error: string | null;
    discovered: number;
    withEmail: number;
    createdAt: Date;
    finishedAt: Date | null;
  },
  hits: ProspectHitDto[]
): ProspectScanDto {
  return {
    id: row.id,
    region: row.region,
    sector: row.sector,
    focus: row.focus,
    status: row.status,
    error: row.error ?? "",
    discovered: row.discovered,
    withEmail: row.withEmail,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? "",
    hits,
  };
}

function scoreHit(input: {
  country: string | null;
  email: string | null;
  website: string | null;
  source: string;
}): number {
  let score = countryScore(input.country);
  if (input.email) {
    score += 20;
    if (isBusinessLocalPart(input.email)) score += 12;
    const site = input.website ? parsePublicHttpUrl(input.website) : null;
    if (site && input.email.endsWith(`@${originKey(site)}`)) score += 18;
  }
  if (input.source === "SEC Form D") score += 8;
  return Math.min(100, score);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      out[current] = await fn(items[current]!);
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function extraCompanies(raw: string[] | undefined): DiscoveredCompany[] {
  if (!raw?.length) return [];
  const out: DiscoveredCompany[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (out.length >= MAX_EXTRA_SITES) break;
    const url = parsePublicHttpUrl(value);
    if (!url) continue;
    const key = originKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: key,
      website: url.href,
      country: null,
      sector: "Site fourni",
      source: "Site officiel (manuel)",
      sourceUrl: url.href,
      inception: null,
    });
  }
  return out;
}

function dedupeCompanies(list: DiscoveredCompany[]): DiscoveredCompany[] {
  const byHost = new Map<string, DiscoveredCompany>();
  const nameless: DiscoveredCompany[] = [];
  for (const item of list) {
    const url = item.website ? parsePublicHttpUrl(item.website) : null;
    if (!url) {
      nameless.push(item);
      continue;
    }
    const key = originKey(url);
    if (!byHost.has(key)) {
      byHost.set(key, { ...item, website: `https://${key}` });
    }
  }
  return [...byHost.values(), ...nameless].slice(0, MAX_DISCOVER);
}

export async function listProspectScans(companyId: string): Promise<ProspectScanDto[]> {
  if (!hasDatabase()) return [];
  const scans = await prisma.prospectScan.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { hits: { orderBy: { score: "desc" }, take: 40 } },
  });
  return scans.map((scan) => mapScan(scan, scan.hits.map(mapHit)));
}

async function saveHit(
  companyId: string,
  scanId: string,
  hit: {
    name: string;
    website: string | null;
    email: string | null;
    country: string | null;
    sector: string | null;
    source: string;
    sourceUrl: string | null;
    notes: string | null;
    score: number;
  }
) {
  return prisma.prospectHit.create({
    data: { companyId, scanId, ...hit },
  });
}

export async function runProspectScan(companyId: string, input: ScanInput) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };

  const scan = await prisma.prospectScan.create({
    data: {
      companyId,
      region: input.region,
      sector: input.sector,
      focus: input.focus,
      status: "running",
      createdByEmail: input.createdByEmail ?? null,
    },
  });

  try {
    const includeEdgar =
      (input.region === "americas" || input.region === "US") &&
      input.focus !== "established";

    const [wiki, edgar] = await Promise.all([
      discoverWikidataCompanies({
        region: input.region,
        sector: input.sector,
        focus: input.focus === "mix" ? "startups" : input.focus,
        limit: 12,
      }).catch(() => [] as DiscoveredCompany[]),
      includeEdgar
        ? discoverEdgarFormD(10).catch(() => [] as DiscoveredCompany[])
        : Promise.resolve([] as DiscoveredCompany[]),
    ]);

    let wikiList = wiki;
    if (wikiList.length < 4 && input.focus === "mix") {
      const more = await discoverWikidataCompanies({
        region: input.region,
        sector: input.sector,
        focus: "established",
        limit: 12,
      }).catch(() => [] as DiscoveredCompany[]);
      wikiList = [...wikiList, ...more];
    }

    const discovered = dedupeCompanies([
      ...extraCompanies(input.extraWebsites),
      ...wikiList,
      ...edgar,
    ]);

    const withSite = discovered.filter((d) => d.website).slice(0, MAX_ENRICH);
    const withoutSite = discovered.filter((d) => !d.website).slice(0, 8);

    const enriched = await mapPool(withSite, 3, async (company) => {
      const parsedSite = parsePublicHttpUrl(company.website ?? "");
      const result = await emailsFromOfficialSite(company.website ?? "");
      const email = pickBestEmail(
        result.emails,
        parsedSite ? originKey(parsedSite) : undefined
      );
      const notes = result.skippedRobots
        ? "robots.txt interdit le fetch du site."
        : email
          ? "Email publié sur le site officiel."
          : "Aucun email publié trouvé sur l’accueil /contact.";
      return {
        name: company.name,
        website: result.website || company.website,
        email,
        country: company.country,
        sector: company.sector ?? sectorById(input.sector).label,
        source: company.source,
        sourceUrl: company.sourceUrl,
        notes,
        score: scoreHit({
          country: company.country,
          email,
          website: result.website || company.website,
          source: company.source,
        }),
      };
    });

    const filingOnly = withoutSite.map((company) => ({
      name: company.name,
      website: null as string | null,
      email: null as string | null,
      country: company.country,
      sector: company.sector,
      source: company.source,
      sourceUrl: company.sourceUrl,
      notes: "Dépôt public (SEC) — pas de site officiel dans la source.",
      score: scoreHit({
        country: company.country,
        email: null,
        website: null,
        source: company.source,
      }),
    }));

    const saved = [];
    for (const hit of [...enriched, ...filingOnly]) {
      saved.push(await saveHit(companyId, scan.id, hit));
    }

    const withEmail = saved.filter((h) => h.email).length;
    const updated = await prisma.prospectScan.update({
      where: { id: scan.id },
      data: {
        status: "completed",
        discovered: saved.length,
        withEmail,
        finishedAt: new Date(),
      },
      include: { hits: { orderBy: { score: "desc" } } },
    });

    return {
      scan: mapScan(updated, updated.hits.map(mapHit)),
      regionLabel: AMERICAS_REGION_LABELS[input.region],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan interrompu.";
    const updated = await prisma.prospectScan.update({
      where: { id: scan.id },
      data: { status: "failed", error: message.slice(0, 400), finishedAt: new Date() },
      include: { hits: true },
    });
    return { scan: mapScan(updated, updated.hits.map(mapHit)), error: message };
  }
}

export async function importProspectHits(
  companyId: string,
  hitIds: string[],
  owner?: string
) {
  if (!hasDatabase()) return { error: DATABASE_REQUIRED_MESSAGE };
  const ids = [...new Set(hitIds.filter(Boolean))].slice(0, 40);
  if (!ids.length) return { error: "Aucun prospect à importer." };

  const hits = await prisma.prospectHit.findMany({
    where: { companyId, id: { in: ids } },
  });
  if (!hits.length) return { error: "Prospects introuvables." };

  const imported: string[] = [];
  for (const hit of hits) {
    const result = await upsertLead(companyId, {
      name: hit.name,
      email: hit.email ?? undefined,
      source: `Prospecteur · ${hit.source}`,
      status: "new",
      score: hit.score,
      owner,
    });
    if ("lead" in result && result.lead) {
      await prisma.prospectHit.updateMany({
        where: { id: hit.id, companyId },
        data: { importedLeadId: result.lead.id },
      });
      imported.push(result.lead.id);
    }
  }
  return { imported: imported.length };
}

export function scanMeta() {
  return {
    regions: Object.entries(AMERICAS_REGION_LABELS).map(([id, label]) => ({ id, label })),
    sectors: PROSPECT_SECTORS.map((s) => ({ id: s.id, label: s.label })),
    focuses: [
      { id: "mix", label: "Mixte (startups + établies)" },
      { id: "startups", label: "Nouvelles entreprises / startups" },
      { id: "established", label: "Entreprises établies" },
    ],
  };
}
