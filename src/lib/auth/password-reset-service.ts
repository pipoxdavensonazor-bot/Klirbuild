import crypto from "crypto";
import { hasDatabase } from "@/lib/auth/auth-service";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/email-service";

const TOKEN_HOURS = 2;

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { error: "Courriel requis." as const };
  if (!hasDatabase()) {
    return { ok: true as const, demo: true as const };
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return { ok: true as const };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 3600000);

  await prisma.passwordResetToken.create({
    data: { email: normalized, token, expiresAt },
  });

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://www.klirline.app";
  const link = `${base}/reset-password?token=${token}`;

  await sendEmail({
    companyId: user.companyId,
    to: normalized,
    subject: "Réinitialiser votre mot de passe KlirBuild",
    text: `Bonjour,\n\nCliquez pour réinitialiser votre mot de passe :\n${link}\n\nCe lien expire dans ${TOKEN_HOURS} heures.`,
    html: `<p>Bonjour,</p><p><a href="${link}">Réinitialiser votre mot de passe</a></p><p>Ce lien expire dans ${TOKEN_HOURS} heures.</p>`,
  });

  return { ok: true as const };
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (!token.trim() || password.length < 8) {
    return { error: "Token invalide ou mot de passe trop court (8+)." as const };
  }
  if (!hasDatabase()) {
    return { error: "DATABASE_URL requis." as const };
  }

  const row = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { error: "Lien expiré ou invalide." as const };
  }

  const user = await prisma.user.findUnique({ where: { email: row.email } });
  if (!user) return { error: "Compte introuvable." as const };

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    ok: true as const,
    user: { email: user.email, companyId: user.companyId, role: user.role },
  };
}
