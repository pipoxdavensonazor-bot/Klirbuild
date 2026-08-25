const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,24}/g;

const REJECT_DOMAINS = new Set([
  "example.com",
  "example.org",
  "email.com",
  "domain.com",
  "sentry.io",
  "wixpress.com",
  "cloudflare.com",
  "schema.org",
  "w3.org",
  "github.com",
  "githubusercontent.com",
]);

const REJECT_LOCAL = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "webmaster",
]);

const BUSINESS_LOCAL = [
  "contact",
  "hello",
  "info",
  "sales",
  "press",
  "presse",
  "commercial",
  "team",
  "office",
  "support",
  "partenariat",
  "partners",
  "partner",
  "bonjour",
  "accueil",
  "admin",
  "business",
  "vendor",
  "vendeur",
  "marketplace",
];

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#64;/g, "@")
    .replace(/&amp;/g, "&")
    .replace(/\[at\]/gi, "@")
    .replace(/\(at\)/gi, "@");
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase().replace(/[.,;:]+$/, "");
  if (!email.includes("@") || email.length > 254) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain || local.length > 64) return null;
  if (REJECT_LOCAL.has(local)) return null;
  if (REJECT_DOMAINS.has(domain)) return null;
  if (domain.endsWith(".png") || domain.endsWith(".jpg") || domain.endsWith(".gif")) return null;
  if (!/^[a-z0-9._%+\-]+$/.test(local)) return null;
  if (!/^[a-z0-9.\-]+\.[a-z]{2,24}$/.test(domain)) return null;
  return `${local}@${domain}`;
}

function localPart(email: string): string {
  return email.split("@")[0] ?? "";
}

function domainPart(email: string): string {
  return email.split("@")[1] ?? "";
}

export function extractPublicEmails(
  html: string,
  siteHost?: string
): string[] {
  const text = decodeHtml(`${html} ${stripTags(html)}`);
  const found = text.match(EMAIL_RE) ?? [];
  const unique = new Map<string, string>();
  for (const raw of found) {
    const email = normalizeEmail(raw);
    if (!email) continue;
    unique.set(email, email);
  }

  const host = siteHost?.replace(/^www\./, "").toLowerCase();
  const ranked = [...unique.values()].sort((a, b) => {
    const aBiz = BUSINESS_LOCAL.includes(localPart(a)) ? 1 : 0;
    const bBiz = BUSINESS_LOCAL.includes(localPart(b)) ? 1 : 0;
    if (aBiz !== bBiz) return bBiz - aBiz;
    const aDom = host && domainPart(a).endsWith(host) ? 1 : 0;
    const bDom = host && domainPart(b).endsWith(host) ? 1 : 0;
    if (aDom !== bDom) return bDom - aDom;
    return a.localeCompare(b);
  });

  return ranked.slice(0, 3);
}

export function pickBestEmail(emails: string[], siteHost?: string): string | null {
  return extractPublicEmails(emails.join(" "), siteHost)[0] ?? emails[0] ?? null;
}

export function isBusinessLocalPart(email: string): boolean {
  return BUSINESS_LOCAL.includes(localPart(email));
}
