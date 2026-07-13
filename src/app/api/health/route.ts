import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/auth/auth-service";
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";
import { isStripeConfigured } from "@/lib/stripe";
import { isZernioEnabled } from "@/lib/social-ads/zernio-service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function checkMarketingSchema(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await prisma.socialAccountConnection.count();
    await prisma.socialAdCampaignRecord.count();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist")) {
      return {
        ok: false,
        detail: "Tables marketing absentes — npm run db:push sur la base Netlify",
      };
    }
    return { ok: false, detail: "Schéma marketing non synchronisé" };
  }
}

function resolveAppUrl(request: Request) {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit;
  const netlify =
    process.env.URL?.trim() ||
    process.env.DEPLOY_PRIME_URL?.trim() ||
    process.env.DEPLOY_URL?.trim();
  if (netlify) return netlify;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return undefined;
}

export async function GET(request: Request) {
  const appUrl = resolveAppUrl(request);

  const checks: Record<string, { ok: boolean; detail?: string; tier?: "core" | "billing" | "optional" }> = {
    app: { ok: true, tier: "core" },
    database: { ok: false, detail: "DATABASE_URL manquant", tier: "core" },
    schema: { ok: false, detail: "DATABASE_URL manquant", tier: "core" },
    auth: {
      ok: process.env.DEMO_AUTH_BYPASS !== "true",
      detail:
        process.env.DEMO_AUTH_BYPASS === "true"
          ? "DEMO_AUTH_BYPASS=true — désactiver en production"
          : undefined,
      tier: "core",
    },
    stripe: {
      ok: isStripeConfigured(),
      detail: isStripeConfigured() ? undefined : "STRIPE_SECRET_KEY manquant",
      tier: "billing",
    },
    webhook: {
      ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      detail: process.env.STRIPE_WEBHOOK_SECRET?.trim()
        ? undefined
        : "STRIPE_WEBHOOK_SECRET manquant",
      tier: "billing",
    },
    appUrl: {
      ok: Boolean(appUrl),
      detail: appUrl ? undefined : "NEXT_PUBLIC_APP_URL recommandé en production",
      tier: "optional",
    },
    cron: {
      ok: Boolean(process.env.CRON_SECRET?.trim()),
      detail: process.env.CRON_SECRET?.trim()
        ? undefined
        : "CRON_SECRET manquant — automations cron non sécurisées",
      tier: "optional",
    },
    zernio: {
      ok: isZernioEnabled(),
      detail: isZernioEnabled() ? undefined : "ZERNIO_API_KEY manquant",
      tier: "optional",
    },
    googleOAuth: {
      ok: isGoogleOAuthConfigured(),
      detail: isGoogleOAuthConfigured()
        ? undefined
        : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants",
      tier: "optional",
    },
    openai: {
      ok: Boolean(process.env.OPENAI_API_KEY?.trim()),
      detail: process.env.OPENAI_API_KEY?.trim()
        ? undefined
        : "OPENAI_API_KEY manquant — réponses locales limitées",
      tier: "optional",
    },
    resend: {
      ok: Boolean(process.env.RESEND_API_KEY?.trim()),
      detail: process.env.RESEND_API_KEY?.trim()
        ? undefined
        : "RESEND_API_KEY manquant — courriels désactivés",
      tier: "optional",
    },
    resendInbound: {
      ok: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
      detail: process.env.RESEND_WEBHOOK_SECRET?.trim()
        ? undefined
        : "RESEND_WEBHOOK_SECRET manquant — réception entrante non sécurisée",
      tier: "optional",
    },
  };

  if (hasDatabase()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true, tier: "core" };
      try {
        const companyCount = await prisma.company.count();
        const marketing = await checkMarketingSchema();
        checks.schema = { ...marketing, tier: "core" };
        checks.seed = {
          ok: companyCount > 0,
          detail:
            companyCount > 0
              ? undefined
              : "Aucune entreprise — exécutez npm run db:seed",
          tier: "core",
        };
      } catch (e) {
        checks.schema = {
          ok: false,
          detail:
            e instanceof Error && e.message.includes("does not exist")
              ? "Tables de base manquantes — exécutez npm run db:push"
              : "Schéma Prisma non synchronisé",
          tier: "core",
        };
      }
    } catch (e) {
      checks.database = {
        ok: false,
        detail: e instanceof Error ? e.message : "Connexion DB échouée",
        tier: "core",
      };
    }
  }

  const coreOk = Object.values(checks)
    .filter((c) => c.tier === "core")
    .every((c) => c.ok);
  const billingOk = Object.values(checks)
    .filter((c) => c.tier === "billing")
    .every((c) => c.ok);
  const optionalOk = Object.values(checks)
    .filter((c) => c.tier === "optional")
    .every((c) => c.ok);

  const status = !coreOk ? "unavailable" : coreOk && billingOk ? "ready" : "degraded";

  return NextResponse.json(
    {
      status,
      environment: process.env.NODE_ENV,
      appUrl: appUrl ?? null,
      summary: {
        core: coreOk,
        billing: billingOk,
        optional: optionalOk,
      },
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: coreOk && billingOk ? 200 : 503 }
  );
}
