/** Allow a safe subset of HTML from the TipTap editor (text + images + videos). */

function safeUrl(raw: string): string | null {
  const href = raw.trim();
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("/api/media/") ||
    href.startsWith("/") ||
    href.startsWith("#")
  ) {
    return href.replace(/"/g, "");
  }
  return null;
}

export function sanitizeRichHtml(input: string): string {
  if (!input) return "";
  let html = input;

  // Remove dangerous tags (keep video/source/img)
  html = html.replace(
    /<\/?(script|style|iframe|object|embed|link|meta|form)[^>]*>/gi,
    ""
  );
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/javascript:/gi, "");

  html = html.replace(
    /href\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_m, _q, d1, d2) => {
      const ok = safeUrl(d1 ?? d2 ?? "");
      return ok ? `href="${ok}"` : 'href="#"';
    }
  );

  html = html.replace(
    /src\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (_m, _q, d1, d2) => {
      const ok = safeUrl(d1 ?? d2 ?? "");
      return ok ? `src="${ok}"` : 'src=""';
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
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n/g, "<br />");
}
