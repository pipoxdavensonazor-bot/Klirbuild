const RESEND_RECEIVING_HOST = "api.resend.com";

/** Identifiant d’e-mail Resend : alphanumériques, tiret, underscore. */
export function isResendEmailId(emailId: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(emailId);
}

/**
 * Construit l’URL Resend « receiving » après validation de l’id.
 * Retourne null si l’id est invalide ou si l’hôte ne serait pas api.resend.com.
 */
export function resendReceivingUrl(emailId: string): URL | null {
  if (!isResendEmailId(emailId)) return null;
  const url = new URL(`https://${RESEND_RECEIVING_HOST}/emails/receiving/${emailId}`);
  if (url.protocol !== "https:" || url.hostname !== RESEND_RECEIVING_HOST) {
    return null;
  }
  return url;
}

/** Extrait l’adresse dans des chevrons, sans regexp (évite un ReDoS). */
export function normalizeAddress(raw: string) {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("<");
  const end = start === -1 ? -1 : trimmed.indexOf(">", start + 1);
  if (start !== -1 && end !== -1) {
    return trimmed.slice(start + 1, end).trim().toLowerCase();
  }
  return trimmed.toLowerCase();
}
