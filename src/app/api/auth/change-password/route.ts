import { NextResponse } from "next/server";
import { enrichSession, getRequestSession } from "@/lib/auth/auth-service";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimitResponse } from "@/lib/auth/rate-limit";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = rateLimitResponse(request, "change-password", { limit: 10 });
  if (limited) return limited;

  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Mot de passe actuel et nouveau requis." },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: DATABASE_REQUIRED_MESSAGE }, { status: 503 });
  }

  const enriched = await enrichSession(session);
  const user = await prisma.user.findUnique({
    where: { email: enriched.email },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
