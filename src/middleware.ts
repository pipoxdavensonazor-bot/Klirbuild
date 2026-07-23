import { NextResponse, type NextRequest } from "next/server";
import { parseSessionCookie } from "@/lib/auth/demo-session";
import {
  apiRequiresDatabase,
  databaseRequiredResponse,
  hasDatabaseUrl,
} from "@/lib/api/database-guard";
import { can, type Permission, type Role } from "@/types";

const PUBLIC_PATHS = [
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
  "/docs",
];

/**
 * La connexion est obligatoire par défaut (SIGN IN / SIGN UP requis).
 * Mettre DEMO_AUTH_BYPASS="true" uniquement pour une démo sans login.
 */
const DEMO_AUTH_BYPASS =
  process.env.DEMO_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (apiRequiresDatabase(pathname) && !hasDatabaseUrl()) {
    return databaseRequiredResponse();
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
  const parsed = session?.value ? await parseSessionCookie(session.value) : null;
  if (!parsed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const response = NextResponse.redirect(url);
    if (session?.value) {
      response.cookies.set("klirline_session", "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("x-klirline-role", parsed.role);
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
