import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/password-reset-service";

export async function POST(request: Request) {
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
    demo: "demo" in result && result.demo,
  });
}
