"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  LayoutGrid,
  Link2,
  Megaphone,
  Plus,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ZERNIO_CONNECTION_PLATFORMS } from "@/lib/social-ads/zernio-connections-catalog";

export type MarketingTab = "summary" | "connections" | "planning" | "campaigns" | "reports";

type Props = {
  tab: MarketingTab;
  onTabChange: (tab: MarketingTab) => void;
  selectedPlatform?: string | null;
  onPlatformSelect?: (platformId: string | null) => void;
  connectedCount?: number;
  children: ReactNode;
};

const TOP_NAV: { id: MarketingTab; label: string; icon: typeof Link2 }[] = [
  { id: "summary", label: "Résumé", icon: LayoutGrid },
  { id: "connections", label: "Connexions", icon: Link2 },
  { id: "planning", label: "Planification", icon: CalendarClock },
  { id: "campaigns", label: "Annonces", icon: Megaphone },
  { id: "reports", label: "Rapports", icon: BarChart3 },
];

const SIDEBAR_PLATFORMS = ZERNIO_CONNECTION_PLATFORMS.filter((p) => p.sidebar);

export function MarketingMetricoolShell({
  tab,
  onTabChange,
  selectedPlatform,
  onPlatformSelect,
  connectedCount = 0,
  children,
}: Props) {
  const showPlatformSidebar = tab === "connections" || tab === "summary";

  return (
    <div className="-mx-4 -mt-2 overflow-hidden rounded-xl border border-border bg-[#f4f6f8] shadow-sm sm:-mx-6 lg:-mx-8">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#2d2d2d] bg-[#1e1e1e] px-3 py-2 text-white">
        <div className="mr-3 flex shrink-0 items-center gap-2 pr-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
            K
          </div>
          <span className="hidden text-sm font-semibold sm:inline">Klirline Marketing</span>
        </div>
        {TOP_NAV.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition sm:text-sm",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {item.id === "connections" && connectedCount > 0 ? (
                <span className="rounded-full bg-emerald-500 px-1.5 text-[10px] text-white">
                  {connectedCount}
                </span>
              ) : null}
            </button>
          );
        })}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <span className="rounded-md bg-amber-400 px-2 py-1 text-[10px] font-semibold text-[#1a1a1a]">
            Zernio
          </span>
        </div>
      </div>

      <div className="flex min-h-[640px]">
        {showPlatformSidebar ? (
          <aside className="relative hidden w-52 shrink-0 flex-col border-r border-[#e2e6ea] bg-[#fafbfc] lg:flex">
            <nav className="flex-1 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => onPlatformSelect?.(null)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition",
                  !selectedPlatform
                    ? "bg-[#fff8dc] font-medium text-[#333]"
                    : "text-[#555] hover:bg-[#f0f2f5]"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Summary
              </button>
              {SIDEBAR_PLATFORMS.map((platform) => {
                const active = selectedPlatform === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => onPlatformSelect?.(platform.id)}
                    className={cn(
                      "mb-0.5 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                      active
                        ? "bg-[#fff8dc] font-medium text-[#333]"
                        : "text-[#555] hover:bg-[#f0f2f5]"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white",
                          platform.iconBg
                        )}
                      >
                        {platform.monogram.slice(0, 2)}
                      </span>
                      {platform.name}
                    </span>
                    <Plus className="h-3.5 w-3.5 text-[#999]" />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onTabChange("reports")}
                className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[#555] hover:bg-[#f0f2f5]"
              >
                <BarChart3 className="h-4 w-4" />
                Rapports
              </button>
            </nav>
            <div className="border-t border-[#e2e6ea] p-2">
              <button
                type="button"
                onClick={() => onTabChange("connections")}
                className="flex w-full items-center gap-2 rounded-full bg-[#1e1e1e] px-4 py-2.5 text-xs font-medium text-white"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Paramètres des connexions
              </button>
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
