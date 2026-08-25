import type { DiscoveredCompany } from "@/lib/prospecting/types";
import { PROSPECT_USER_AGENT } from "@/lib/prospecting/website-email";

const EDGAR_ATOM =
  "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=D&owner=include&count=40&output=atom";

const TITLE_RE = /^D\s+-\s+(.+?)\s+\(\d+\)/i;

export function parseEdgarAtom(xml: string): DiscoveredCompany[] {
  const entries = xml.split(/<entry[\s>]/i).slice(1);
  const out: DiscoveredCompany[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const title = /<title[^>]*>([^<]+)<\/title>/i.exec(entry)?.[1]?.trim();
    const link =
      /<link[^>]+href="([^"]+)"/i.exec(entry)?.[1] ??
      /<id>([^<]+)<\/id>/i.exec(entry)?.[1];
    if (!title) continue;
    const name = (TITLE_RE.exec(title)?.[1] ?? title.replace(/^D\s+-\s+/i, "")).trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({
      name,
      website: null,
      country: "États-Unis",
      sector: "Startup (Form D SEC)",
      source: "SEC Form D",
      sourceUrl: link ?? EDGAR_ATOM,
      inception: null,
    });
  }
  return out;
}

export async function discoverEdgarFormD(limit: number): Promise<DiscoveredCompany[]> {
  const res = await fetch(EDGAR_ATOM, {
    headers: {
      Accept: "application/atom+xml,application/xml,text/xml",
      "User-Agent": PROSPECT_USER_AGENT,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseEdgarAtom(xml).slice(0, Math.min(Math.max(limit, 1), 20));
}
