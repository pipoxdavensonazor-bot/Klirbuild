/**
 * Crée / met à jour le compte Admin plateforme en prod.
 *
 * Usage:
 *   PLATFORM_ADMIN_PASSWORD='…' npx tsx scripts/seed-platform-admin.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const PLATFORM_COMPANY_ID = "klirline_platform";
const EMAIL =
  process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() || "admin@klirline.ca";
const PASSWORD =
  process.env.PLATFORM_ADMIN_PASSWORD?.trim() || "KlirAdmin!2026";

function connectionString() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL manquant");
  // Prefer session pooler host if env still points at stale aws-0 / 6543
  try {
    const u = new URL(raw);
    if (u.hostname.includes("aws-0-") && u.hostname.includes("pooler.supabase.com")) {
      u.hostname = u.hostname.replace("aws-0-", "aws-1-");
    }
    if (u.port === "6543") u.port = "5432";
    return u.toString();
  } catch {
    return raw;
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function main() {
  const adapter = new PrismaPg({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const company = await prisma.company.upsert({
      where: { id: PLATFORM_COMPANY_ID },
      create: {
        id: PLATFORM_COMPANY_ID,
        name: "Klirline Inc.",
        email: "billing@klirline.ca",
        plan: "business",
        subscriptionStatus: "active",
        enabledModules: ["construction-os", "crm", "payroll", "social_ads"],
        marketRegion: "CA-QC",
      },
      update: {
        name: "Klirline Inc.",
        plan: "business",
        subscriptionStatus: "active",
      },
    });

    const passwordHash = await hashPassword(PASSWORD);
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      create: {
        name: "Admin KlirBuild",
        email: EMAIL,
        passwordHash,
        role: "SUPER_ADMIN",
        isPlatformAdmin: true,
        companyId: company.id,
      },
      update: {
        passwordHash,
        role: "SUPER_ADMIN",
        isPlatformAdmin: true,
        companyId: company.id,
      },
    });

    const demoAd = await prisma.sponsoredAdCampaign.findFirst({
      where: {
        advertiserCompanyId: company.id,
        title: "KlirBuild Ads — Démo",
      },
    });
    if (!demoAd) {
      await prisma.sponsoredAdCampaign.create({
        data: {
          advertiserCompanyId: company.id,
          title: "KlirBuild Ads — Démo",
          headline: "Équipez vos chantiers plus vite",
          body: "Offres partenaires construction diffusées dans KlirBuild Ads.",
          ctaLabel: "Voir l'offre",
          ctaUrl: "https://klirline.app/billing",
          surface: "dashboard",
          status: "active",
          dailyBudgetCad: 40,
          totalBudgetCad: 400,
          bidCpmCad: 8,
          bidCpcCad: 1.5,
          platformFeePct: 100,
          startAt: new Date(),
        },
      });
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email: user.email,
          companyId: company.id,
          isPlatformAdmin: true,
          loginUrl: "https://klirline.app/login",
          consoleUrl: "https://klirline.app/platform",
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
