import { NextResponse } from "next/server";
import {
  createSessionValue,
  sessionCookieOptions,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  const cookie = sessionCookieOptions(createSessionValue());
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
