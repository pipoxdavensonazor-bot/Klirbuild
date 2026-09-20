/**
 * Routes visibles sans session. `/` is an exact match only —
 * never treat it as a prefix (every path starts with `/`).
 */
export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/privacy",
  "/terms",
  "/live",
  "/client-live",
  "/offline",
  "/download",
  "/invite",
  "/accueil",
  "/marketing",
  "/contact",
] as const;

export const PUBLIC_EXACT_PATHS = ["/", "/accueil", "/marketing", "/contact"] as const;

const NATIVE_UA = /Capacitor|KlirBuild\/|Tauri/i;

export function isNativeUserAgent(ua: string | null | undefined): boolean {
  return Boolean(ua && NATIVE_UA.test(ua));
}

export function isPublicPath(pathname: string): boolean {
  if ((PUBLIC_EXACT_PATHS as readonly string[]).includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Native shells (Capacitor / Tauri) boot on `/` and expect login, not marketing.
 * Web visitors on `/` see the public landing.
 */
export function isUnauthenticatedPublicPath(
  pathname: string,
  userAgent?: string | null
): boolean {
  if (pathname === "/" && isNativeUserAgent(userAgent)) return false;
  return isPublicPath(pathname);
}
