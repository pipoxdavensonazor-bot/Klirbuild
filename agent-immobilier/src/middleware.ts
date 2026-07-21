import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "leonne_admin_session";

function expectedToken() {
  const password = process.env.ADMIN_PASSWORD || "LeonneAdmin2026";
  const secret = process.env.ADMIN_SECRET || password;
  let h = 0;
  const input = `${password}::${secret}`;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return `adm_${Math.abs(h).toString(16)}_${input.length}`;
}

export function middleware(request: NextRequest) {
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
    pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Allow login page + login API without auth
  if (isLogin || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // Public GET on properties list is ok for site; mutate needs auth
  if (pathname.startsWith("/api/properties") && request.method === "GET") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE)?.value;
  if (token !== expectedToken()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/properties/:path*",
    "/api/profile/:path*",
    "/api/articles/:path*",
    "/api/seminars/:path*",
    "/api/upload/:path*",
    "/api/social/:path*",
    "/api/admin/:path*",
  ],
};
