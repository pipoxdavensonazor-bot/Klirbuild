import { NextResponse, type NextRequest } from "next/server";
import { parseSessionCookie } from "@/lib/auth/demo-session";
import { can, type Permission, type Role } from "@/types";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/privacy", "/terms"];

/**
 * La connexion est obligatoire par défaut (SIGN IN / SIGN UP requis).
 * Mettre DEMO_AUTH_BYPASS="true" uniquement pour une démo sans login.
 */
const DEMO_AUTH_BYPASS = process.env.DEMO_AUTH_BYPASS === "true";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.split(":")[0];

  // Redirige le domaine apex vers www, sauf les appels API (évite les POST cassés).
  if (host === "klirline.app" && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.host = "www.klirline.app";
    return NextResponse.redirect(url, 308);
  }

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (DEMO_AUTH_BYPASS) {
    const response = NextResponse.next();
    response.headers.set("x-klirline-role", "COMPANY_ADMIN");
    return response;
  }

  const session = request.cookies.get("klirline_session");
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const parsed = parseSessionCookie(session.value);
  const response = NextResponse.next();
  if (parsed?.role) {
    response.headers.set("x-klirline-role", parsed.role);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

/** Server helper for route handlers / RSC once auth is live */
export function assertPermission(role: Role, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error(`Forbidden: missing ${permission}`);
  }
}
