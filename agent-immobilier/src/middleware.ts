import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionTokenMatches } from "@/lib/admin-session";
import { applySecurityHeaders } from "@/lib/security-headers";

const COOKIE = "leonne_admin_session";

function withSecurityHeaders(response: NextResponse) {
  applySecurityHeaders(response.headers);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isLogin = pathname === "/admin/login";
  const isAdminApi =
    pathname.startsWith("/api/properties") ||
    pathname.startsWith("/api/profile") ||
    pathname.startsWith("/api/articles") ||
    pathname.startsWith("/api/seminars") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/social") ||
    pathname.startsWith("/api/messages") ||
    pathname.startsWith("/api/testimonials") ||
    pathname.startsWith("/api/admin");

  // Public pages: still attach security headers
  if (!isAdminPage && !isAdminApi) {
    // /api/media has its own access rules — still add headers
    return withSecurityHeaders(NextResponse.next());
  }

  // Allow login page + login / totp setup APIs appropriately
  if (isLogin || pathname === "/api/admin/login") {
    return withSecurityHeaders(NextResponse.next());
  }

  // Public GET on properties list is ok for site; mutate needs auth
  if (pathname.startsWith("/api/properties") && request.method === "GET") {
    return withSecurityHeaders(NextResponse.next());
  }

  // Contact form: public POST only
  if (pathname.startsWith("/api/messages") && request.method === "POST") {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (!(await sessionTokenMatches(token))) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Non autorisé" }, { status: 401 })
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Apply security headers broadly; auth only on admin + listed APIs.
     * Skip Next internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
