import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionResponse, hasDatabase } from "@/lib/auth/auth-service";
import {
  PENDING_2FA_COOKIE,
  verifyPending2faToken,
} from "@/lib/auth/demo-session";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { decryptTotpSecret } from "@/lib/auth/totp-crypto";
import { verifyTotpCode } from "@/lib/auth/totp";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = rateLimit({
    key: `2fa:${ip}`,
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${limited.retryAfterSec}s.` },
      { status: 429 }
    );
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "2FA indisponible sans base de données." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }

  const jar = await cookies();
  const pendingRaw = jar.get(PENDING_2FA_COOKIE)?.value;
  if (!pendingRaw) {
    return NextResponse.json(
      { error: "Session 2FA expirée. Reconnectez-vous." },
      { status: 401 }
    );
  }

  const pending = await verifyPending2faToken(pendingRaw);
  if (!pending) {
    return NextResponse.json(
      { error: "Session 2FA expirée. Reconnectez-vous." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: pending.email },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!user?.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA non configurée." }, { status: 400 });
  }

  let secret: string;
  try {
    secret = decryptTotpSecret(user.totpSecret);
  } catch {
    return NextResponse.json({ error: "Secret 2FA invalide." }, { status: 500 });
  }

  if (!verifyTotpCode(secret, code)) {
    return NextResponse.json({ error: "Code invalide." }, { status: 401 });
  }

  const res = await sessionResponse({
    email: pending.email,
    companyId: pending.companyId,
    role: pending.role,
  });
  res.cookies.set(PENDING_2FA_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
