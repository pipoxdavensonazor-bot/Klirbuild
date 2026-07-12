"use client";

import { useEffect } from "react";
import { apiUrl } from "@/lib/api-client";
import { useSessionStore } from "@/lib/workforce/session";
import type { MarketRegionId } from "@/lib/markets/regions";
import type { Role } from "@/types";
import type { SubscriptionPlanId } from "@/lib/billing/plans";

export function SessionSync() {
  useEffect(() => {
    void fetch(apiUrl("/api/auth/session"), { credentials: "include" })
      .then((r) => r.json())
      .then((data: {
        authenticated?: boolean;
        role?: Role;
        plan?: SubscriptionPlanId;
        marketRegion?: MarketRegionId;
        subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled";
      }) => {
        if (!data.authenticated) return;
        if (data.role) useSessionStore.getState().setRole(data.role);
        if (data.plan) {
          useSessionStore.getState().syncBilling({
            plan: data.plan,
            subscriptionStatus: data.subscriptionStatus,
          });
        }
        if (data.marketRegion) {
          useSessionStore.getState().setMarketRegion(data.marketRegion);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
