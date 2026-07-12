import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/auth/auth-service";
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";
import { isStripeConfigured } from "@/lib/stripe";
import { isZernioEnabled } from "@/lib/social-ads/zernio-service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {
    app: { ok: true },
    database: { ok: false, detail: "DATABASE_URL manquant" },
    schema: { ok: false, detail: "DATABASE_URL manquant" },
    stripe: { ok: isStripeConfigured(), detail: isStripeConfigured() ? undefined : "STRIPE_SECRET_KEY manquant" },
    auth: {
      ok: process.env.DEMO_AUTH_BYPASS !== "true",
      detail:
        process.env.DEMO_AUTH_BYPASS === "true"
          ? "DEMO_AUTH_BYPASS=true — désactiver en production"
          : undefined,
    },
    webhook: {
      ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      detail: process.env.STRIPE_WEBHOOK_SECRET?.trim()
        ? undefined
        : "STRIPE_WEBHOOK_SECRET manquant",
    },
    appUrl: {
      ok: Boolean(
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
          process.env.URL?.trim() ||
          process.env.DEPLOY_PRIME_URL?.trim()
      ),
      detail: "NEXT_PUBLIC_APP_URL recommandé en production",
    },
    zernio: {
      ok: isZernioEnabled(),
      detail: isZernioEnabled() ? undefined : "ZERNIO_API_KEY manquant",
    },
    googleOAuth: {
      ok: isGoogleOAuthConfigured(),
      detail: isGoogleOAuthConfigured()
        ? undefined
        : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants",
    },
  };

  if (hasDatabase()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true };
      try {
        await prisma.company.count();
        checks.schema = { ok: true };
        const companyCount = await prisma.company.count();
        checks.seed = {
          ok: companyCount > 0,
          detail:
            companyCount > 0
              ? undefined
              : "Aucune entreprise — exécutez npm run db:seed",
        };
      } catch (e) {
        checks.schema = {
          ok: false,
          detail:
            e instanceof Error && e.message.includes("does not exist")
              ? "Tables manquantes — exécutez npm run db:push"
              : "Schéma Prisma non synchronisé",
        };
      }
    } catch (e) {
      checks.database = {
        ok: false,
        detail: e instanceof Error ? e.message : "Connexion DB échouée",
      };
    }
  }

  const ready = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      environment: process.env.NODE_ENV,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}
