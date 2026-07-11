import fs from "fs";
import path from "path";
import type { SubscriptionPlanId } from "@/lib/billing/plans";
import { DEMO_COMPANY_ID } from "@/lib/billing/constants";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type CompanySubscription = {
  companyId: string;
  email: string;
  plan: SubscriptionPlanId;
  billingCycle: "monthly" | "yearly";
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "subscription.json");

const DEFAULT: CompanySubscription = {
  companyId: DEMO_COMPANY_ID,
  email: "billing@klirline.demo",
  plan: "growth",
  billingCycle: "monthly",
  subscriptionStatus: "trialing",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  updatedAt: new Date().toISOString(),
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT, null, 2), "utf8");
  }
}

export function readSubscription(companyId = DEMO_COMPANY_ID): CompanySubscription {
  ensureStore();
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as CompanySubscription;
    if (raw.companyId === companyId) return raw;
  } catch {
    /* fall through */
  }
  return { ...DEFAULT, companyId };
}

export function writeSubscription(data: CompanySubscription) {
  ensureStore();
  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

export function updateSubscription(
  patch: Partial<CompanySubscription>,
  companyId = DEMO_COMPANY_ID
) {
  const current = readSubscription(companyId);
  const next = { ...current, ...patch, companyId };
  writeSubscription(next);
  return next;
}
