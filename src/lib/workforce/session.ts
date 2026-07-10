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
import { employees } from "@/lib/workforce/mock-data";

type SessionState = {
  role: Role;
  employeeId: string;
  plan: SubscriptionPlanId;
  billingCycle: "monthly" | "yearly";
  marketRegion: MarketRegionId;
  currency: CurrencyCode;
  locale: LocaleCode;
  autoPilot: boolean;
  setRole: (role: Role) => void;
  setEmployeeId: (id: string) => void;
  setPlan: (plan: SubscriptionPlanId) => void;
  setBillingCycle: (cycle: "monthly" | "yearly") => void;
  setMarketRegion: (id: MarketRegionId) => void;
  setCurrency: (c: CurrencyCode) => void;
  setLocale: (l: LocaleCode) => void;
  setAutoPilot: (on: boolean) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: "COMPANY_ADMIN",
      employeeId: employees[0]?.id ?? "emp_1",
      plan: "growth",
      billingCycle: "monthly",
      marketRegion: "CA-QC",
      currency: "CAD",
      locale: "fr",
      autoPilot: true,
      setRole: (role) => {
        const match = employees.find((e) => e.role === role);
        set({
          role,
          employeeId: match?.id ?? employees[0]?.id ?? "emp_1",
        });
      },
      setEmployeeId: (employeeId) => {
        const emp = employees.find((e) => e.id === employeeId);
        set({
          employeeId,
          role: emp?.role ?? "EMPLOYEE",
        });
      },
      setPlan: (plan) => set({ plan }),
      setBillingCycle: (billingCycle) => set({ billingCycle }),
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
