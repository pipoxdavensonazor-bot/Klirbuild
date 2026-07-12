"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";
import type { SubscriptionPlanId } from "@/lib/billing/plans";
import type {
  CurrencyCode,
  LocaleCode,
  MarketRegionId,
} from "@/lib/markets/regions";
import { getMarket } from "@/lib/markets/regions";

type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete";

type SessionState = {
  role: Role;
  employeeId: string | null;
  userName: string;
  userEmail: string;
  plan: SubscriptionPlanId;
  billingCycle: "monthly" | "yearly";
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  marketRegion: MarketRegionId;
  currency: CurrencyCode;
  locale: LocaleCode;
  autoPilot: boolean;
  setRole: (role: Role) => void;
  setEmployeeId: (id: string | null) => void;
  setPlan: (plan: SubscriptionPlanId) => void;
  setBillingCycle: (cycle: "monthly" | "yearly") => void;
  setSubscriptionStatus: (status: SubscriptionStatus) => void;
  setStripeCustomerId: (id: string | null) => void;
  syncBilling: (data: {
    plan: SubscriptionPlanId;
    billingCycle?: "monthly" | "yearly";
    subscriptionStatus?: SubscriptionStatus;
    stripeCustomerId?: string | null;
  }) => void;
  syncProfile: (data: {
    role?: Role;
    employeeId?: string | null;
    name?: string;
    email?: string;
    plan?: SubscriptionPlanId;
    subscriptionStatus?: SubscriptionStatus;
    marketRegion?: MarketRegionId;
  }) => void;
  setMarketRegion: (id: MarketRegionId) => void;
  setCurrency: (c: CurrencyCode) => void;
  setLocale: (l: LocaleCode) => void;
  setAutoPilot: (on: boolean) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: "COMPANY_ADMIN",
      employeeId: null,
      userName: "",
      userEmail: "",
      plan: "growth",
      billingCycle: "monthly",
      subscriptionStatus: "trialing",
      stripeCustomerId: null,
      marketRegion: "CA-QC",
      currency: "CAD",
      locale: "fr",
      autoPilot: true,
      setRole: (role) => set({ role }),
      setEmployeeId: (employeeId) => set({ employeeId }),
      setPlan: (plan) => set({ plan }),
      setBillingCycle: (billingCycle) => set({ billingCycle }),
      setSubscriptionStatus: (subscriptionStatus) => set({ subscriptionStatus }),
      setStripeCustomerId: (stripeCustomerId) => set({ stripeCustomerId }),
      syncBilling: (data) =>
        set((s) => ({
          plan: data.plan ?? s.plan,
          billingCycle: data.billingCycle ?? s.billingCycle,
          subscriptionStatus: data.subscriptionStatus ?? s.subscriptionStatus,
          stripeCustomerId:
            data.stripeCustomerId !== undefined ? data.stripeCustomerId : s.stripeCustomerId,
        })),
      syncProfile: (data) =>
        set((s) => ({
          role: data.role ?? s.role,
          employeeId: data.employeeId !== undefined ? data.employeeId : s.employeeId,
          userName: data.name ?? s.userName,
          userEmail: data.email ?? s.userEmail,
          plan: data.plan ?? s.plan,
          subscriptionStatus: data.subscriptionStatus ?? s.subscriptionStatus,
          marketRegion: data.marketRegion ?? s.marketRegion,
        })),
      setMarketRegion: (marketRegion) => {
        const m = getMarket(marketRegion);
        set({
          marketRegion,
          currency: m.currency,
          locale: m.defaultLocale,
        });
      },
      setCurrency: (currency) => set({ currency }),
      setLocale: (locale) => set({ locale }),
      setAutoPilot: (autoPilot) => set({ autoPilot }),
    }),
    { name: "klirline-session-role" }
  )
);
