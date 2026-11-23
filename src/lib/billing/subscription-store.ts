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

function isFsCode(err: unknown, code: string): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === code);
}

/** Écriture atomique : fichier temporaire puis rename (évite une course exists/write). */
function writeFileAtomic(filePath: string, contents: string) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, contents, "utf8");
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

function ensureStore() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(DEFAULT, null, 2), {
        encoding: "utf8",
        flag: "wx",
      });
    } catch (err) {
      if (!isFsCode(err, "EEXIST")) throw err;
    }
  } catch {
    /* Vercel/serverless: filesystem read-only — use in-memory defaults */
  }
}

export function readSubscription(companyId = DEMO_COMPANY_ID): CompanySubscription {
  try {
    ensureStore();
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as CompanySubscription;
    if (raw.companyId === companyId) return raw;
  } catch {
    /* fall through */
  }
  return { ...DEFAULT, companyId };
}

export function writeSubscription(data: CompanySubscription) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    writeFileAtomic(
      STORE_PATH,
      JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2)
    );
  } catch {
    /* ignore on serverless */
  }
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
