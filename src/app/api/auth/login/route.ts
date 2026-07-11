import { NextResponse } from "next/server";
import { authenticateUser, sessionResponse } from "@/lib/auth/auth-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  }

  const profile = await authenticateUser(email, password);
  if (!profile) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  return sessionResponse(profile);
}
