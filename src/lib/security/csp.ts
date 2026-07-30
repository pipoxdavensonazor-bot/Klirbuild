/**
 * Baseline Content-Security-Policy for Klirline (Cloudflare / Next App Router).
 * Uses unsafe-inline for scripts/styles so hydration + Tailwind keep working
 * without per-request nonces (OpenNext Workers). Still blocks object/plugin
 * XSS vectors and clickjacking via frame-ancestors.
 */

function isDev() {
  return process.env.NODE_ENV !== "production";
}

export function buildContentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev() ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const connectSrc = [
    "'self'",
    "https://api.daily.co",
    "https://*.daily.co",
    "wss://*.daily.co",
    "https://api.stripe.com",
    "https://*.stripe.com",
    "https://accounts.google.com",
    "https://oauth2.googleapis.com",
    "https://www.googleapis.com",
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    ...(isDev() ? ["http://localhost:*", "ws://localhost:*"] : []),
  ].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://*.daily.co https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

export function securityHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy": buildContentSecurityPolicy(),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(self)",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "X-DNS-Prefetch-Control": "off",
    ...(process.env.NODE_ENV === "production"
      ? {
          "Strict-Transport-Security":
            "max-age=31536000; includeSubDomains; preload",
        }
      : {}),
  };
}
