import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/admin-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const cookie = clearSessionCookieOptions();
  res.cookies.set(cookie.name, cookie.value, cookie);
  return res;
}
