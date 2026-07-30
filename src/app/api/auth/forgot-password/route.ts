import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/password-reset-service";
import { rateLimitResponse } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "forgot-password", { limit: 8 });
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const result = await requestPasswordReset(email);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    message:
      "Si un compte existe, un courriel de réinitialisation a été envoyé.",
    // Never reveal demo/DB mode in production responses.
    ...(process.env.NODE_ENV !== "production" &&
    "demo" in result &&
    result.demo
      ? { demo: true }
      : {}),
  });
}
