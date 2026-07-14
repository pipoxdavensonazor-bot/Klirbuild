import { NextResponse } from "next/server";
import {
  enrichSession,
  getRequestSession,
  hasDatabase,
} from "@/lib/auth/auth-service";
import { encryptTotpSecret, decryptTotpSecret } from "@/lib/auth/totp-crypto";
import { generateTotpSecret, totpUri, verifyTotpCode } from "@/lib/auth/totp";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function requireUser() {
  const session = await getRequestSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Connexion requise" }, { status: 401 }) };
  }
  if (!hasDatabase()) {
    return {
      error: NextResponse.json(
        { error: "Base de données requise pour la 2FA." },
        { status: 503 }
      ),
    };
  }
  const enriched = await enrichSession(session);
  const user = await prisma.user.findUnique({
    where: { email: enriched.email },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      totpEnabled: true,
      totpSecret: true,
    },
  });
  if (!user) {
    return { error: NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 }) };
  }
  return { user, enriched };
}

export async function GET() {
  const ctx = await requireUser();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { user } = ctx;
  return NextResponse.json({
    totpEnabled: user.totpEnabled,
    role: user.role,
  });
}

/** Start setup: generate secret (not enabled until POST enable). */
export async function POST(request: Request) {
  const ctx = await requireUser();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { user } = ctx;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "setup";

  if (action === "setup") {
    if (user.totpEnabled) {
      return NextResponse.json(
        { error: "2FA déjà activée. Désactivez-la avant de recommencer." },
        { status: 400 }
      );
    }
    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: encryptTotpSecret(secret),
        totpEnabled: false,
      },
    });
    return NextResponse.json({
      secret,
      uri: totpUri({ secret, email: user.email, issuer: "KlirBuild" }),
      message: "Ajoutez ce secret dans votre appli d’authentification, puis confirmez avec un code.",
    });
  }

  if (action === "enable") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!user.totpSecret) {
      return NextResponse.json(
        { error: "Lancez d’abord la configuration 2FA." },
        { status: 400 }
      );
    }
    let secret: string;
    try {
      secret = decryptTotpSecret(user.totpSecret);
    } catch {
      return NextResponse.json({ error: "Secret invalide." }, { status: 500 });
    }
    if (!verifyTotpCode(secret, code)) {
      return NextResponse.json({ error: "Code invalide." }, { status: 401 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });
    return NextResponse.json({ ok: true, totpEnabled: true });
  }

  if (action === "disable") {
    const password = typeof body.password === "string" ? body.password : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
    }
    if (user.totpEnabled && user.totpSecret) {
      try {
        const secret = decryptTotpSecret(user.totpSecret);
        if (!verifyTotpCode(secret, code)) {
          return NextResponse.json({ error: "Code 2FA invalide." }, { status: 401 });
        }
      } catch {
        return NextResponse.json({ error: "Secret 2FA invalide." }, { status: 500 });
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false },
    });
    return NextResponse.json({ ok: true, totpEnabled: false });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
