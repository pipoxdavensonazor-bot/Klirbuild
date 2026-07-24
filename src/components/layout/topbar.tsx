"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Moon, Search, Sun, Command } from "lucide-react";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { useTheme } from "next-themes";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/lib/workforce/session";
import { getPlan, routeAllowedForPlan, type SubscriptionPlanId } from "@/lib/billing/plans";
import { getMarket, marketProfiles, type MarketRegionId } from "@/lib/markets/regions";
import type { Role } from "@/types";
import { ALL_ROLES, roleLabelFr } from "@/lib/workforce/roles";
import { cn } from "@/lib/utils";

const commands = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Marchés US/CA/Caraïbes", href: "/markets" },
  { label: "Auto-Pilot", href: "/auto-pilot" },
  { label: "Conformité", href: "/compliance" },
  { label: "Abonnement", href: "/billing" },
  { label: "Construction OS", href: "/construction" },
  { label: "Chantiers ERP", href: "/construction/jobs" },
  { label: "Estimés construction", href: "/construction/estimates" },
  { label: "CCQ conformité", href: "/construction/ccq" },
  { label: "CRM Construction", href: "/construction/crm" },
  { label: "Paiements chantier", href: "/construction/payments" },
  { label: "Marketing PME", href: "/construction/marketing" },
  { label: "Pubs réseaux sociaux", href: "/social-ads" },
  { label: "Pubs sponsorisées", href: "/ads/sponsor" },
  { label: "Console plateforme", href: "/platform" },
  { label: "Rapports T4", href: "/reports/t4" },
  { label: "IA Chantier", href: "/construction/ai" },
  { label: "Pointage GPS", href: "/timeclock" },
  { label: "Localisation chantier", href: "/locations" },
  { label: "Paie automatique", href: "/payroll" },
  { label: "Comptabilité & taxes", href: "/accounting" },
  { label: "Chat sécurisé", href: "/team-chat" },
  { label: "CRM", href: "/crm" },
  { label: "Clients", href: "/clients" },
  { label: "Invoices", href: "/invoices" },
  { label: "Projects", href: "/projects" },
  { label: "Klir AI", href: "/ai" },
  { label: "Mon profil", href: "/profile" },
  { label: "Settings", href: "/settings" },
  { label: "Centre d'aide", href: "/help" },
];

const roles: Role[] = ALL_ROLES;
const plans: SubscriptionPlanId[] = ["starter", "growth", "business", "enterprise"];

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const role = useSessionStore((s) => s.role);
  const planId = useSessionStore((s) => s.plan);
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const setRole = useSessionStore((s) => s.setRole);
  const setPlan = useSessionStore((s) => s.setPlan);
  const setMarketRegion = useSessionStore((s) => s.setMarketRegion);
  const plan = getPlan(planId);
  const market = getMarket(marketRegion);

  const crumbs = useMemo(
    () =>
      pathname
        .split("/")
        .filter(Boolean)
        .map((part) => part.replaceAll("-", " ")),
    [pathname]
  );

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) &&
      routeAllowedForPlan(planId, c.href)
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="app-topbar sticky top-0 z-20 flex items-center gap-1.5 overflow-hidden border-b border-border bg-background/90 px-2 backdrop-blur sm:gap-2 sm:px-3 md:gap-3 md:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 lg:hidden"
          onClick={onMenu}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <KlirBuildLogo
          variant="full"
          priority
          zoom={0.95}
          className="app-topbar-logo h-6 w-[64px] shrink-0 sm:h-7 sm:w-[76px] lg:hidden"
        />

        <div className="hidden min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground md:flex">
          <span className="font-medium text-foreground">KlirBuild</span>
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:bg-brand-950 dark:text-brand-200">
            {plan.name}
          </span>
          <span className="hidden rounded-md bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-700 xl:inline">
            {market.id} · {market.currency}
          </span>
          {crumbs.map((c) => (
            <span key={c} className="flex items-center gap-2 capitalize">
              <span>/</span>
              <span>{c}</span>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Rechercher"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-slate-50 text-muted-foreground transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 md:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto hidden h-10 w-full max-w-xs items-center gap-2 rounded-md border border-border bg-slate-50 px-3 text-sm text-muted-foreground transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 md:ml-0 md:flex"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] sm:inline-flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        <select
          aria-label="Marché"
          className="hidden h-9 max-w-[150px] rounded-md border border-border bg-background px-2 text-xs xl:block"
          value={marketRegion}
          onChange={(e) => setMarketRegion(e.target.value as MarketRegionId)}
        >
          {marketProfiles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>

        <select
          aria-label="Simuler un plan"
          className="hidden h-9 max-w-[120px] rounded-md border border-border bg-background px-2 text-xs lg:block"
          value={planId}
          onChange={(e) => setPlan(e.target.value as SubscriptionPlanId)}
        >
          {plans.map((p) => (
            <option key={p} value={p}>
              Plan {getPlan(p).name}
            </option>
          ))}
        </select>

        <select
          aria-label="Simuler un rôle"
          className="hidden h-9 max-w-[160px] rounded-md border border-border bg-background px-2 text-xs md:block"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabelFr(r)}
            </option>
          ))}
        </select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>

        <div className="shrink-0">
          <NotificationsBell />
        </div>

        <div className="shrink-0">
          <ProfileMenu />
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[max(12vh,calc(env(safe-area-inset-top,0px)+4rem))]">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-soft">
            <div className="border-b border-border p-3">
              <Input
                autoFocus
                placeholder="Type a command…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.map((item) => (
                <button
                  key={item.href}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
                  )}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    router.push(item.href);
                  }}
                >
                  {item.label}
                </button>
              ))}
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
