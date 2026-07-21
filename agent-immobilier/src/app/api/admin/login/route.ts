import { NextResponse } from "next/server";
import {
  createSessionToken,
  getAdminSecretsError,
  sessionCookieOptions,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(req: Request) {
  const secretsError = getAdminSecretsError();
  if (secretsError) {
    return NextResponse.json({ error: secretsError }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
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
