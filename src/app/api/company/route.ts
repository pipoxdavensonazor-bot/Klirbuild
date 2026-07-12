import { hasDatabase } from "@/lib/auth/auth-service";
import { requireSession } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Base de données requise." }, { status: 503 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      emailFrom: true,
      inboxEmail: true,
      emailSenderName: true,
      logoUrl: true,
      brandingPrimary: true,
      brandingAccent: true,
      plan: true,
      subscriptionStatus: true,
      marketRegion: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Entreprise introuvable." }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Base de données requise." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, string> = {};

  for (const key of [
    "name",
    "email",
    "phone",
    "website",
    "emailFrom",
    "inboxEmail",
    "emailSenderName",
    "logoUrl",
    "brandingPrimary",
    "brandingAccent",
    "marketRegion",
  ] as const) {
    if (typeof body[key] === "string") {
      data[key] = body[key].trim();
    }
  }

  if (data.email) data.email = data.email.toLowerCase();
  if (data.emailFrom) data.emailFrom = data.emailFrom.toLowerCase();
  if (data.inboxEmail) data.inboxEmail = data.inboxEmail.toLowerCase();

  const company = await prisma.company.update({
    where: { id: session.companyId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      website: true,
      emailFrom: true,
      inboxEmail: true,
      emailSenderName: true,
      logoUrl: true,
      brandingPrimary: true,
      brandingAccent: true,
      marketRegion: true,
    },
  });

  return NextResponse.json({ company });
}
