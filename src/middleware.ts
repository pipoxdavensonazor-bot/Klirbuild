import { NextResponse, type NextRequest } from "next/server";
import { parseSessionCookie } from "@/lib/auth/demo-session";
import { can, type Permission, type Role } from "@/types";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/privacy", "/terms"];

/**
 * Demo middleware: allows all app routes.
 * When Better Auth / Clerk is wired, replace DEMO_AUTH_BYPASS with real session checks.
 */
const DEMO_AUTH_BYPASS = process.env.DEMO_AUTH_BYPASS !== "false";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
