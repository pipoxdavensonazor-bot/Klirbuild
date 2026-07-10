"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Moon, Search, Sun, Command } from "lucide-react";
import { useTheme } from "next-themes";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employees } from "@/lib/workforce/mock-data";
import { useSessionStore } from "@/lib/workforce/session";
import { getPlan, routeAllowedForPlan, type SubscriptionPlanId } from "@/lib/billing/plans";
import { getMarket, marketProfiles, type MarketRegionId } from "@/lib/markets/regions";
import type { Role } from "@/types";
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
  { label: "Settings", href: "/settings" },
];

const roles: Role[] = ["COMPANY_ADMIN", "MANAGER", "EMPLOYEE", "SUPER_ADMIN"];
const plans: SubscriptionPlanId[] = ["starter", "growth", "business", "enterprise"];

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const planId = useSessionStore((s) => s.plan);
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const setRole = useSessionStore((s) => s.setRole);
  const setPlan = useSessionStore((s) => s.setPlan);
  const setMarketRegion = useSessionStore((s) => s.setMarketRegion);
  const employee = employees.find((e) => e.id === employeeId) ?? employees[0];
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
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
          <Menu className="h-4 w-4" />
        </Button>

        <KlirBuildLogo
          variant="full"
          priority
          className="h-[52px] w-[150px] shrink-0 lg:hidden"
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
          onClick={() => setOpen(true)}
          className="ml-auto flex h-10 w-full max-w-xs items-center gap-2 rounded-md border border-border bg-slate-50 px-3 text-sm text-muted-foreground transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 md:ml-0"
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
              {r.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
            {employee?.avatarInitials ?? "AR"}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-medium">{employee?.name ?? "User"}</p>
            <p className="text-[10px] text-muted-foreground">{role}</p>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]">
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
