import { NextResponse } from "next/server";
import {
  authenticateUser,
  hasDatabase,
  sessionResponse,
} from "@/lib/auth/auth-service";
import {
  COOKIE,
  createPending2faToken,
  PENDING_2FA_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/demo-session";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit({
    key: `login:${ip}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  const emailLimited = rateLimit({
    key: `login-email:${email}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!emailLimited.ok) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${emailLimited.retryAfterSec}s.` },
      {
        status: 429,
        headers: { "Retry-After": String(emailLimited.retryAfterSec) },
      }
    );
  }

  const profile = await authenticateUser(email, password);
  if (!profile) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  if (profile.totpEnabled && hasDatabase()) {
    const pending = await createPending2faToken({
      email: profile.email,
      companyId: profile.companyId,
      role: profile.role,
    });
    const res = NextResponse.json({
      ok: true,
      requires2fa: true,
      email: profile.email,
    });
    res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(
      PENDING_2FA_COOKIE,
      pending.token,
      sessionCookieOptions(pending.maxAge)
    );
    return res;
  }

  const res = await sessionResponse(profile);
  res.cookies.set(PENDING_2FA_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
