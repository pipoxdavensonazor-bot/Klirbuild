import { createHmac, timingSafeEqual } from "crypto";
import { getPlan } from "@/lib/billing/plans";
import { getUploadsKv } from "@/lib/storage/kv";

export type PaidBillingPlanId = "starter" | "growth" | "business";
export type BillingCycle = "monthly" | "yearly";

export type MonCashPlanOrder = {
  orderId: string;
  companyId: string;
  email?: string;
  plan: PaidBillingPlanId;
  cycle: BillingCycle;
  amountCad: number;
  amountHtg: number;
  createdAt: string;
  expiresAt: string;
};

const ORDER_TTL_SECONDS = 60 * 60;

function signingSecret() {
  return (
    process.env.MONCASH_ORDER_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "klirbuild-moncash-dev-secret"
  );
}

function htgPerCad() {
  const raw = Number(process.env.MONCASH_HTG_PER_CAD || "95");
  return Number.isFinite(raw) && raw > 0 ? raw : 95;
}

export function isPaidBillingPlan(plan: string): plan is PaidBillingPlanId {
  return plan === "starter" || plan === "growth" || plan === "business";
}

export function planAmountCad(plan: PaidBillingPlanId, cycle: BillingCycle) {
  const p = getPlan(plan);
  return cycle === "yearly" ? p.yearlyPrice : p.monthlyPrice;
}

export function planAmountHtg(plan: PaidBillingPlanId, cycle: BillingCycle) {
  return Math.max(1, Math.round(planAmountCad(plan, cycle) * htgPerCad()));
}

function newOrderId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `KB${Date.now().toString(36)}${rand}`.slice(0, 40);
}

function kvKey(orderId: string) {
  return `moncash:plan:${orderId}`;
}

function signPayload(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function buildMonCashPlanOrder(input: {
  companyId: string;
  email?: string;
  plan: PaidBillingPlanId;
  cycle: BillingCycle;
}): MonCashPlanOrder {
  const now = Date.now();
  return {
    orderId: newOrderId(),
    companyId: input.companyId,
    email: input.email,
    plan: input.plan,
    cycle: input.cycle,
    amountCad: planAmountCad(input.plan, input.cycle),
    amountHtg: planAmountHtg(input.plan, input.cycle),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ORDER_TTL_SECONDS * 1000).toISOString(),
  };
}

export function signMonCashPlanOrder(order: MonCashPlanOrder) {
  const payload = Buffer.from(JSON.stringify(order), "utf8").toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyMonCashPlanToken(token: string): MonCashPlanOrder | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = signPayload(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const order = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as MonCashPlanOrder;
    if (!order?.orderId || !order.companyId || !isPaidBillingPlan(order.plan)) {
      return null;
    }
    if (Date.parse(order.expiresAt) < Date.now()) return null;
    return order;
  } catch {
    return null;
  }
}

export async function storeMonCashPlanOrder(order: MonCashPlanOrder) {
  const kv = await getUploadsKv();
  if (!kv) return false;
  await kv.put(kvKey(order.orderId), JSON.stringify(order), {
    expirationTtl: ORDER_TTL_SECONDS,
  });
  return true;
}

export async function loadMonCashPlanOrder(orderId: string) {
  const kv = await getUploadsKv();
  if (!kv) return null;
  const raw = await kv.get(kvKey(orderId));
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as MonCashPlanOrder;
  } catch {
    return null;
  }
}

export async function deleteMonCashPlanOrder(orderId: string) {
  const kv = await getUploadsKv();
  if (!kv) return;
  await kv.delete(kvKey(orderId));
}

export function periodEndFromCycle(cycle: BillingCycle, from = new Date()) {
  const end = new Date(from);
  if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}
