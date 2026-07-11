import { NextResponse } from "next/server";
import { registerCompany, sessionResponse } from "@/lib/auth/auth-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email || !companyName || !password) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères" },
      { status: 400 }
    );
  }

  const result = await registerCompany({ name, email, companyName, password });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (!result.user) {
    return NextResponse.json({ error: "Inscription échouée" }, { status: 500 });
  }

  return sessionResponse(result.user);
}
