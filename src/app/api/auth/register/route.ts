import { NextResponse } from "next/server";
import { registerCompany, sessionResponse } from "@/lib/auth/auth-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("[auth/register]", error);
    const detail =
      error instanceof Error &&
      (error.message.includes("does not exist") || error.message.includes("P2021"))
        ? "Schéma base de données manquant. Exécutez npm run db:push sur Neon."
        : "Erreur serveur lors de l'inscription.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
