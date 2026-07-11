import { NextResponse } from "next/server";
import { COOKIE, sessionCookieOptions } from "@/lib/auth/demo-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
