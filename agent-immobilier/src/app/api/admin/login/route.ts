import { NextResponse } from "next/server";
import {
  createSessionToken,
  getAdminSecretsError,
  sessionCookieOptions,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { getSetting, TOTP_ENABLED_KEY, TOTP_SECRET_KEY } from "@/lib/settings";
import { verifyTotp } from "@/lib/totp";

const PENDING = "leonne_admin_pending";

export async function POST(req: Request) {
  const secretsError = getAdminSecretsError();
  if (secretsError) {
    return NextResponse.json({ error: secretsError }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  const totpCode = String(body.totp || "").trim();
  const step = String(body.step || "password");

  const totpEnabled = (await getSetting(TOTP_ENABLED_KEY)) === "1";
  const totpSecret = await getSetting(TOTP_SECRET_KEY);

  // Step 2: TOTP after password challenge cookie
  if (step === "totp" || totpCode) {
    const cookieHeader = req.headers.get("cookie") || "";
    const pending = /(?:^|;\s*)leonne_admin_pending=1(?:;|$)/.test(cookieHeader);
    if (!pending || !totpEnabled || !totpSecret) {
      return NextResponse.json({ error: "Session 2FA invalide" }, { status: 401 });
    }
    if (!(await verifyTotp(totpSecret, totpCode))) {
      return NextResponse.json({ error: "Code 2FA incorrect" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    const token = await createSessionToken();
    const cookie = sessionCookieOptions(token);
    res.cookies.set(cookie.name, cookie.value, cookie);
    res.cookies.set(PENDING, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
  }

  // Password OK — if 2FA on, require second step
  if (totpEnabled && totpSecret) {
    const res = NextResponse.json({ ok: true, needsTotp: true });
    res.cookies.set(PENDING, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5,
    });
    return res;
  }

  try {
    const res = NextResponse.json({ ok: true });
    const token = await createSessionToken();
    const cookie = sessionCookieOptions(token);
    res.cookies.set(cookie.name, cookie.value, cookie);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Configuration admin invalide";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
