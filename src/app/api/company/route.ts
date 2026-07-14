import { hasDatabase } from "@/lib/auth/auth-service";
import { requireSession } from "@/lib/auth/auth-service";
import { prisma } from "@/lib/db";
import { ensureCompanyInboxEmail } from "@/lib/email/company-email";
import { NextResponse } from "next/server";

const companySelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  website: true,
  emailFrom: true,
  inboxEmail: true,
  emailSenderName: true,
  employerBn: true,
  logoUrl: true,
  brandingPrimary: true,
  brandingAccent: true,
  plan: true,
  subscriptionStatus: true,
  marketRegion: true,
  enabledModules: true,
} as const;

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  if (!hasDatabase()) {
    return NextResponse.json({ error: "Base de données requise." }, { status: 503 });
  }

  await ensureCompanyInboxEmail(session.companyId);

  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: companySelect,
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
  const data: Record<string, unknown> = {};

  for (const key of [
    "name",
    "email",
    "phone",
    "website",
    "emailFrom",
    "emailSenderName",
    "employerBn",
    "logoUrl",
    "brandingPrimary",
    "brandingAccent",
    "marketRegion",
  ] as const) {
    if (typeof body[key] === "string") {
      data[key] = body[key].trim();
    }
  }

  if (Array.isArray(body.enabledModules)) {
    data.enabledModules = body.enabledModules.filter(
      (m: unknown) => typeof m === "string" && m.trim()
    );
  }

  if (typeof data.email === "string") data.email = data.email.toLowerCase();
  if (typeof data.emailFrom === "string") data.emailFrom = data.emailFrom.toLowerCase();

  // inboxEmail is platform-managed — never accept client writes
  await ensureCompanyInboxEmail(session.companyId);

  const company = await prisma.company.update({
    where: { id: session.companyId },
    data,
    select: companySelect,
  });

  return NextResponse.json({ company });
}
