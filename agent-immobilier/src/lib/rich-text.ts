/** Allow a safe subset of HTML from the TipTap editor. */
export function sanitizeRichHtml(input: string): string {
  if (!input) return "";
  let html = input;

  // Remove scripts/styles/iframes and event handlers
  html = html.replace(/<\/?(script|style|iframe|object|embed|link|meta)[^>]*>/gi, "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/javascript:/gi, "");

  // Only keep http(s), mailto, tel, relative links in href
  html = html.replace(
    /href\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_m, _q, d1, d2) => {
      const href = (d1 ?? d2 ?? "").trim();
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("/") ||
        href.startsWith("#")
      ) {
        return `href="${href.replace(/"/g, "")}"`;
      }
      return 'href="#"';
    }
  );

  return html.trim();
}

export function isRichHtml(value: string | null | undefined): boolean {
  if (!value) return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Plain-text fallback when content has no HTML tags. */
export function toDisplayHtml(value: string | null | undefined): string {
  if (!value) return "";
  if (isRichHtml(value)) return sanitizeRichHtml(value);
  // Escape + preserve line breaks for legacy plain text
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br />");
}
