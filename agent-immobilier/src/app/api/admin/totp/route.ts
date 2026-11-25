import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getSetting,
  setSetting,
  TOTP_ENABLED_KEY,
  TOTP_SECRET_KEY,
} from "@/lib/settings";
import { generateTotpSecret, totpOtpauthUrl, verifyTotp } from "@/lib/totp";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const enabled = (await getSetting(TOTP_ENABLED_KEY)) === "1";
  const secret = await getSetting(TOTP_SECRET_KEY);
  return NextResponse.json({
    enabled,
    configured: Boolean(secret),
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "setup") {
    const secret = generateTotpSecret();
    await setSetting(TOTP_SECRET_KEY, secret);
    await setSetting(TOTP_ENABLED_KEY, ""); // not enabled until confirmed
    return NextResponse.json({
      secret,
      otpauth: totpOtpauthUrl(secret, "admin"),
    });
  }

  if (action === "enable") {
    const secret = await getSetting(TOTP_SECRET_KEY);
    const code = String(body.totp || "");
    if (!secret) {
      return NextResponse.json({ error: "Générez d’abord un secret" }, { status: 400 });
    }
    if (!(await verifyTotp(secret, code))) {
      return NextResponse.json({ error: "Code invalide" }, { status: 400 });
    }
    await setSetting(TOTP_ENABLED_KEY, "1");
    return NextResponse.json({ ok: true, enabled: true });
  }

  if (action === "disable") {
    const code = String(body.totp || "");
    const secret = await getSetting(TOTP_SECRET_KEY);
    if (secret && !(await verifyTotp(secret, code))) {
      return NextResponse.json(
        { error: "Code 2FA requis pour désactiver" },
        { status: 400 }
      );
    }
    await setSetting(TOTP_ENABLED_KEY, "");
    await setSetting(TOTP_SECRET_KEY, "");
    return NextResponse.json({ ok: true, enabled: false });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
