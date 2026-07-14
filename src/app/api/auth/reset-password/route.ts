import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/password-reset-service";
import { sessionResponse } from "@/lib/auth/auth-service";
import { rateLimitResponse } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "reset-password", { limit: 10 });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  const result = await resetPasswordWithToken(token, password);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  if (result.user) {
    return await sessionResponse(result.user);
  }
  return NextResponse.json({ ok: true });
}
