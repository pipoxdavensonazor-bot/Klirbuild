import { pickTrackingParams, trackingSummary } from "@/lib/marketing/utm";

export const DEMO_INBOX = "Contact@klirline.ca";

export type DemoRequestInput = {
  name: string;
  email: string;
  company: string;
  phone?: string;
  message?: string;
  lang?: string;
  website?: string; // honeypot
  tracking?: Record<string, string | undefined>;
};

export type DemoRequestParsed = {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
  lang: "fr" | "en";
  tracking: URLSearchParams;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = {
  name: 120,
  email: 180,
  company: 160,
  phone: 40,
  message: 4000,
} as const;

export function isHoneypotTripped(input: DemoRequestInput): boolean {
  return Boolean(input.website?.trim());
}

export function parseDemoRequest(
  input: DemoRequestInput
): { ok: true; value: DemoRequestParsed } | { ok: false; error: string } {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const company = input.company?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const message = input.message?.trim() ?? "";
  const lang = input.lang === "en" ? "en" : "fr";

  if (!name || !email || !company) {
    return {
      ok: false,
      error: lang === "en" ? "Name, work email and company are required." : "Nom, courriel et entreprise sont requis.",
    };
  }
  if (name.length > MAX.name || email.length > MAX.email || company.length > MAX.company) {
    return {
      ok: false,
      error: lang === "en" ? "A field is too long." : "Un champ dépasse la longueur maximale.",
    };
  }
  if (phone.length > MAX.phone || message.length > MAX.message) {
    return {
      ok: false,
      error: lang === "en" ? "A field is too long." : "Un champ dépasse la longueur maximale.",
    };
  }
  if (!EMAIL_RE.test(email)) {
    return {
      ok: false,
      error: lang === "en" ? "Enter a valid email address." : "Entrez une adresse courriel valide.",
    };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      company,
      phone,
      message,
      lang,
      tracking: pickTrackingParams(input.tracking ?? {}),
    },
  };
}

export function demoMailto(value: DemoRequestParsed): string {
  const subject =
    value.lang === "en"
      ? `KlirBuild 30-min demo — ${value.company}`
      : `Démo KlirBuild 30 min — ${value.company}`;
  const utm = trackingSummary(value.tracking);
  const body = [
    value.lang === "en"
      ? "I would like to book a 30-minute KlirBuild demo."
      : "Je souhaite réserver une démo KlirBuild de 30 minutes.",
    "",
    `${value.lang === "en" ? "Name" : "Nom"}: ${value.name}`,
    `Email: ${value.email}`,
    `${value.lang === "en" ? "Company" : "Entreprise"}: ${value.company}`,
    value.phone ? `${value.lang === "en" ? "Phone" : "Téléphone"}: ${value.phone}` : null,
    value.message ? `${value.lang === "en" ? "Message" : "Message"}:\n${value.message}` : null,
    utm ? `UTM: ${utm}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `mailto:${DEMO_INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function demoEmailPayload(value: DemoRequestParsed): {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo: string;
} {
  const subject =
    value.lang === "en"
      ? `[KlirBuild Demo] ${value.company}`
      : `[Démo KlirBuild] ${value.company}`;
  const utm = trackingSummary(value.tracking);
  const text = [
    "Nouvelle demande de démo KlirBuild",
    "",
    `Nom : ${value.name}`,
    `Courriel : ${value.email}`,
    `Entreprise : ${value.company}`,
    value.phone ? `Téléphone : ${value.phone}` : null,
    `Langue : ${value.lang}`,
    utm ? `Attribution : ${utm}` : null,
    "",
    "Message :",
    value.message || "(aucun)",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
    <h2>Demande de démo KlirBuild</h2>
    <p><strong>Nom :</strong> ${escapeHtml(value.name)}</p>
    <p><strong>Courriel :</strong> ${escapeHtml(value.email)}</p>
    <p><strong>Entreprise :</strong> ${escapeHtml(value.company)}</p>
    ${value.phone ? `<p><strong>Téléphone :</strong> ${escapeHtml(value.phone)}</p>` : ""}
    <p><strong>Langue :</strong> ${value.lang}</p>
    ${utm ? `<p><strong>Attribution :</strong> ${escapeHtml(utm)}</p>` : ""}
    <hr />
    <p style="white-space:pre-wrap">${escapeHtml(value.message || "(aucun)")}</p>
  `;

  return { to: DEMO_INBOX, subject, text, html, replyTo: value.email };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
