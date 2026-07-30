import { NextResponse } from "next/server";
import { hasDatabase, requireSession } from "@/lib/auth/auth-service";
import { isAuthSecretHardened } from "@/lib/auth/demo-session";
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";
import { can } from "@/types";
import {
  isStripeConfigured,
  isStripePublishableConfigured,
  stripePriceIdsStatus,
} from "@/lib/stripe";
import { isZernioEnabled } from "@/lib/social-ads/zernio-service";
import {
  aiProviderStatusDetail,
  hasLiveAiProvider,
} from "@/lib/ai/chat-provider";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function checkMarketingSchema(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await prisma.socialAccountConnection.count();
    await prisma.socialAdCampaignRecord.count();
    return { ok: true };
  } catch {
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

function canViewDetails(request: Request) {
  const token = process.env.HEALTH_TOKEN?.trim();
  if (!token) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${token}`;
}

/** Public liveness — no secret names, no infra fingerprinting. */
function publicPayload() {
  return {
    status: "ok" as const,
    timestamp: new Date().toISOString(),
    checks: {
      app: { ok: true },
      googleOAuth: { ok: isGoogleOAuthConfigured() },
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wantDetail = url.searchParams.get("detail") === "1";

  if (!wantDetail) {
    return NextResponse.json(publicPayload());
  }

  const tokenOk = canViewDetails(request);
  let viewer: "health-token" | "admin" | null = tokenOk ? "health-token" : null;
  if (!viewer) {
    const session = await requireSession();
    if (session instanceof NextResponse) return session;
    const allowed =
      session.isPlatformAdmin ||
      can(session.role, "settings:manage") ||
      can(session.role, "company:manage");
    if (!allowed) {
      return NextResponse.json(
        { error: "Détails health réservés aux administrateurs." },
        { status: 403 }
      );
    }
    viewer = "admin";
  }

  const appUrl = resolveAppUrl(request);
  const prices = stripePriceIdsStatus();

  const checks: Record<
    string,
    { ok: boolean; detail?: string; tier?: "core" | "billing" | "optional" | "premium" }
  > = {
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
    authSecret: {
      ok: isAuthSecretHardened() || process.env.NODE_ENV !== "production",
      detail: isAuthSecretHardened()
        ? undefined
        : "BETTER_AUTH_SECRET manquant ou trop court (32+)",
      tier: "core",
    },
    stripe: {
      ok: isStripeConfigured(),
      detail: isStripeConfigured() ? undefined : "Stripe non configuré",
      tier: "billing",
    },
    stripePublishable: {
      ok: isStripePublishableConfigured(),
      detail: isStripePublishableConfigured()
        ? undefined
        : "Clé publishable manquante",
      tier: "billing",
    },
    stripePrices: {
      ok: prices.ok,
      detail: prices.ok
        ? `${prices.configured}/${prices.total} Price IDs`
        : `Price IDs manquants: ${prices.missing.length}`,
      tier: "billing",
    },
    webhook: {
      ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      detail: process.env.STRIPE_WEBHOOK_SECRET?.trim()
        ? undefined
        : "Webhook Stripe non configuré",
      tier: "billing",
    },
    appUrl: {
      ok: Boolean(appUrl),
      detail: appUrl ? undefined : "NEXT_PUBLIC_APP_URL recommandé",
      tier: "optional",
    },
    cron: {
      ok: Boolean(process.env.CRON_SECRET?.trim()),
      detail: process.env.CRON_SECRET?.trim()
        ? undefined
        : "CRON_SECRET manquant",
      tier: "optional",
    },
    zernio: {
      ok: true,
      detail: isZernioEnabled() ? "Zernio actif" : "Mode Klirline",
      tier: "premium",
    },
    googleOAuth: {
      ok: isGoogleOAuthConfigured(),
      detail: isGoogleOAuthConfigured()
        ? "Google OAuth actif"
        : "Google OAuth non configuré",
      tier: "premium",
    },
    openai: {
      ok: hasLiveAiProvider(),
      detail: aiProviderStatusDetail(),
      tier: "optional",
    },
    dailyOrJitsi: {
      ok: true,
      detail: process.env.DAILY_API_KEY?.trim()
        ? "Daily.co"
        : "Jitsi Meet",
      tier: "optional",
    },
    resend: {
      ok: Boolean(process.env.RESEND_API_KEY?.trim()),
      detail: process.env.RESEND_API_KEY?.trim()
        ? undefined
        : "Resend non configuré",
      tier: "optional",
    },
    daily: {
      ok: true,
      detail: process.env.DAILY_API_KEY?.trim() ? "Daily" : "Jitsi",
      tier: "premium",
    },
    resendInbound: {
      ok: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
      detail: process.env.RESEND_WEBHOOK_SECRET?.trim()
        ? undefined
        : "Webhook inbound non configuré",
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
          detail: companyCount > 0 ? undefined : "Aucune entreprise",
          tier: "core",
        };
      } catch {
        checks.schema = {
          ok: false,
          detail: "Schéma Prisma non synchronisé",
          tier: "core",
        };
      }
    } catch {
      checks.database = {
        ok: false,
        detail: "Connexion DB échouée",
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
  const httpStatus = coreOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      environment: process.env.NODE_ENV,
      appUrl: appUrl ?? null,
      summary: { core: coreOk, billing: billingOk, optional: optionalOk },
      checks,
      timestamp: new Date().toISOString(),
      viewer,
    },
    { status: httpStatus }
  );
}
