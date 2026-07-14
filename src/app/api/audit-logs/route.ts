import { NextResponse } from "next/server";
import { hasDatabase, requireSession } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Base de données requise." }, { status: 503 });
  }

  const logs = await prisma.auditLog.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ logs });
}
