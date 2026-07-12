import type { SubscriptionStatus as PrismaSubscriptionStatus, Plan } from "@prisma/client";
import type Stripe from "stripe";
import type { SubscriptionPlanId } from "@/lib/billing/plans";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";
import {
  readSubscription,
  updateSubscription,
  type CompanySubscription,
  type SubscriptionStatus,
} from "@/lib/billing/subscription-store";
import { prisma } from "@/lib/db";

import { hasDatabaseUrl } from "@/lib/api/database-guard";

export function hasDatabase() {
  return hasDatabaseUrl();
}

function toPrismaStatus(status: SubscriptionStatus): PrismaSubscriptionStatus {
  if (status === "incomplete") return "trialing";
  return status;
}

function fromPrismaPlan(plan: Plan): SubscriptionPlanId {
  return plan;
}

function toPrismaPlan(plan: SubscriptionPlanId): Plan {
  if (plan === "enterprise") return "business";
  return plan as Plan;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  return "incomplete";
}

function parsePlan(value?: string | null): SubscriptionPlanId {
  const v = value as SubscriptionPlanId;
  if (v === "starter" || v === "growth" || v === "business" || v === "enterprise")
    return v;
  return "growth";
}

function companyToSubscription(
  company: {
    id: string;
    email: string | null;
    plan: Plan;
    subscriptionStatus: PrismaSubscriptionStatus;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  },
  billingCycle: "monthly" | "yearly" = "monthly"
): CompanySubscription {
  return {
    companyId: company.id,
    email: company.email ?? "billing@klirline.demo",
    plan: fromPrismaPlan(company.plan),
    billingCycle,
    subscriptionStatus: company.subscriptionStatus,
    stripeCustomerId: company.stripeCustomerId,
    stripeSubscriptionId: company.stripeSubscriptionId,
    updatedAt: new Date().toISOString(),
  };
}

async function readFromPrisma(companyId: string): Promise<CompanySubscription | null> {
  if (!hasDatabase()) return null;
  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return null;
    return companyToSubscription(company, "monthly");
  } catch (e) {
    console.warn("[billing] Prisma read failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function persistPrisma(
  companyId: string,
  patch: {
    plan: SubscriptionPlanId;
    subscriptionStatus: SubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    email?: string;
  }
) {
  if (!hasDatabase()) return;
  try {
    await prisma.company.upsert({
      where: { id: companyId },
      create: {
        id: companyId,
        name: "KlirBuild Company",
        email: patch.email ?? "billing@klirline.demo",
        plan: toPrismaPlan(patch.plan),
        subscriptionStatus: toPrismaStatus(patch.subscriptionStatus),
        stripeCustomerId: patch.stripeCustomerId ?? undefined,
        stripeSubscriptionId: patch.stripeSubscriptionId ?? undefined,
        enabledModules: ["construction-os"],
      },
      update: {
        plan: toPrismaPlan(patch.plan),
        subscriptionStatus: toPrismaStatus(patch.subscriptionStatus),
        stripeCustomerId: patch.stripeCustomerId ?? undefined,
        stripeSubscriptionId: patch.stripeSubscriptionId ?? undefined,
        ...(patch.email ? { email: patch.email } : {}),
      },
    });
  } catch (e) {
    console.warn("[billing] Prisma sync skipped:", e instanceof Error ? e.message : e);
  }
}

export async function getBillingState(companyId = DEMO_COMPANY_ID) {
  const fromDb = await readFromPrisma(companyId);
  if (fromDb) return fromDb;
  return readSubscription(companyId);
}

export async function syncFromCheckoutSession(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId ?? DEMO_COMPANY_ID;
  const plan = parsePlan(session.metadata?.plan);
  const cycle =
    session.metadata?.cycle === "yearly" ? ("yearly" as const) : ("monthly" as const);
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const email =
    session.customer_details?.email ?? session.customer_email ?? undefined;

  if (!hasDatabase()) {
    updateSubscription(
      {
        plan,
        billingCycle: cycle,
        subscriptionStatus: "trialing",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId,
        ...(email ? { email } : {}),
      },
      companyId
    );
  }

  await persistPrisma(companyId, {
    plan,
    subscriptionStatus: "trialing",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subId,
    email,
  });

  return getBillingState(companyId);
}

export async function syncFromStripeSubscription(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId ?? DEMO_COMPANY_ID;
  const plan = parsePlan(subscription.metadata?.plan);
  const cycle =
    subscription.metadata?.cycle === "yearly" ? ("yearly" as const) : ("monthly" as const);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const status = mapStripeStatus(subscription.status);

  if (!hasDatabase()) {
    updateSubscription(
      {
        plan,
        billingCycle: cycle,
        subscriptionStatus: status,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
      },
      companyId
    );
  }

  await persistPrisma(companyId, {
    plan,
    subscriptionStatus: status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });

  return getBillingState(companyId);
}

export async function updateBillingStatus(
  companyId: string,
  status: SubscriptionStatus
) {
  if (!hasDatabase()) {
    updateSubscription({ subscriptionStatus: status }, companyId);
    return getBillingState(companyId);
  }
  const current = await getBillingState(companyId);
  await persistPrisma(companyId, {
    plan: current.plan,
    subscriptionStatus: status,
    stripeCustomerId: current.stripeCustomerId,
    stripeSubscriptionId: current.stripeSubscriptionId,
  });
  return getBillingState(companyId);
}
