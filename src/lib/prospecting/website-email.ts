import { extractPublicEmails } from "@/lib/prospecting/extract-public-email";
import { originKey, parsePublicHttpUrl } from "@/lib/prospecting/public-url";

export const PROSPECT_USER_AGENT =
  "KlirlineProspecteur/1.0 (+https://www.klirline.ca; Contact@klirline.ca)";

const FETCH_MS = 5000;
const MAX_BODY = 400_000;

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export async function fetchPublicText(url: URL): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": PROSPECT_USER_AGENT,
      },
      signal: timeoutSignal(FETCH_MS),
    });
    if (!res.ok) return null;
    const finalUrl = parsePublicHttpUrl(res.url || url.href);
    if (!finalUrl) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (
      contentType &&
      !/text\/html|application\/xhtml|application\/xml|text\/xml|text\/plain/i.test(
        contentType
      )
    ) {
      return null;
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BODY) {
      return new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, MAX_BODY));
    }
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch {
    return null;
  }
}

function robotsAllowsPath(robotsTxt: string, path: string): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let inStar = false;
  let disallowed: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      inStar = value === "*";
      continue;
    }
    if (!inStar) continue;
    if (key === "disallow" && value) disallowed.push(value);
    if (key === "allow") continue;
  }
  return !disallowed.some((rule) => rule === "/" || path.startsWith(rule));
}

export async function emailsFromOfficialSite(website: string): Promise<{
  website: string;
  emails: string[];
  skippedRobots: boolean;
}> {
  const home = parsePublicHttpUrl(website);
  if (!home) return { website, emails: [], skippedRobots: false };
  const robotsUrl = new URL("/robots.txt", home.origin);
  const robots = await fetchPublicText(robotsUrl);
  if (robots && !robotsAllowsPath(robots, home.pathname || "/")) {
    return { website: home.href, emails: [], skippedRobots: true };
  }

  const pages = [home];
  const contact = new URL("/contact", home.origin);
  if (contact.href !== home.href) pages.push(contact);

  const host = originKey(home);
  const emails = new Set<string>();
  for (const page of pages) {
    const html = await fetchPublicText(page);
    if (!html) continue;
    for (const email of extractPublicEmails(html, host)) {
      emails.add(email);
    }
    if (emails.size > 0) break;
  }
  return { website: home.href, emails: [...emails], skippedRobots: false };
}
