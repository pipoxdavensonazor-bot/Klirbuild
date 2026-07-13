"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Calculator,
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  Globe2,
  Inbox,
  LayoutDashboard,
  Lock,
  MapPin,
  Megaphone,
  MessageSquareLock,
  Receipt,
  Settings,
  Sparkles,
  Users,
  Wallet,
  Workflow,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { KlirBuildLogo } from "@/components/brand/klirline-logo";
import { cn } from "@/lib/utils";
import { getEnabledModuleNav } from "@/modules/registry";
import { canApp, type AppPermission } from "@/lib/workforce/types";
import { useSessionStore } from "@/lib/workforce/session";
import {
  getPlan,
  routeAllowedForPlan,
  type PlanFeatureKey,
} from "@/lib/billing/plans";

type NavDef = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: AppPermission | AppPermission[];
  planFeature?: PlanFeatureKey;
};

const coreNav: NavDef[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, planFeature: "dashboard" },
  { href: "/crm", label: "CRM", icon: Briefcase, permission: "crm:read", planFeature: "crm" },
  { href: "/clients", label: "Clients", icon: Users, permission: "crm:read", planFeature: "crm" },
  { href: "/inbox", label: "Boîte courriel", icon: Inbox, permission: "crm:read", planFeature: "crm" },
  { href: "/quotes", label: "Quotes", icon: FileText, permission: "quotes:read", planFeature: "quotes_invoices" },
  { href: "/invoices", label: "Invoices", icon: Receipt, permission: "invoices:read", planFeature: "quotes_invoices" },
  { href: "/payments", label: "Payments", icon: CreditCard, permission: "billing:manage", planFeature: "quotes_invoices" },
  { href: "/projects", label: "Projects", icon: Building2, permission: "projects:read", planFeature: "projects" },
  { href: "/tasks", label: "Tasks", icon: ClipboardList, permission: "projects:read", planFeature: "projects" },
  { href: "/timeclock", label: "Chronomètre", icon: Clock, permission: "timeclock:use", planFeature: "timeclock" },
  { href: "/locations", label: "Localisation", icon: MapPin, permission: "location:view", planFeature: "locations" },
  { href: "/payroll", label: "Paie", icon: Wallet, permission: "payroll:read", planFeature: "payroll" },
  { href: "/accounting", label: "Comptabilité", icon: Calculator, permission: "accounting:read", planFeature: "accounting" },
  { href: "/reports/t4", label: "Rapports T4", icon: FileText, permission: "payroll:read", planFeature: "t4" },
  { href: "/social-ads", label: "Pubs réseaux", icon: Megaphone, permission: "crm:write", planFeature: "social_ads" },
  { href: "/team-chat", label: "Chat sécurisé", icon: MessageSquareLock, permission: "chat:use", planFeature: "team_chat" },
  { href: "/documents", label: "Documents", icon: FolderOpen, permission: "documents:read", planFeature: "documents" },
  { href: "/ai", label: "AI Assistant", icon: Bot, permission: "ai:use", planFeature: "ai" },
  { href: "/automations", label: "Automations", icon: Workflow, permission: "automations:manage", planFeature: "automations" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read", planFeature: "analytics" },
  { href: "/markets", label: "Marchés US/CA/CB", icon: Globe2, planFeature: "markets" },
  { href: "/compliance", label: "Conformité", icon: ClipboardList, permission: "settings:manage", planFeature: "compliance_hub" },
  { href: "/auto-pilot", label: "Auto-Pilot", icon: Workflow, permission: "automations:manage", planFeature: "auto_pilot" },
  { href: "/help", label: "Centre d'aide", icon: GraduationCap, planFeature: "dashboard" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
];

function roleAllowed(
  role: Parameters<typeof canApp>[0],
  permission?: AppPermission | AppPermission[]
) {
  if (!permission) return true;
  const list = Array.isArray(permission) ? permission : [permission];
  return list.some((p) => canApp(role, p));
}

export function AppSidebar({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const role = useSessionStore((s) => s.role);
  const planId = useSessionStore((s) => s.plan);
  const enabledModules = useSessionStore((s) => s.enabledModules);
  const plan = getPlan(planId);
  const moduleNav = getEnabledModuleNav(
    enabledModules.length ? enabledModules : ["construction-os"]
  );
  const [showLocked, setShowLocked] = useState(false);
  const isCentralAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";

  const { visibleNav, lockedNav } = useMemo(() => {
    const byRole = coreNav.filter((item) => roleAllowed(role, item.permission));
    const visible = byRole.filter(
      (item) => !item.planFeature || routeAllowedForPlan(planId, item.href)
    );
    const locked = byRole.filter(
      (item) => item.planFeature && !routeAllowedForPlan(planId, item.href)
    );
    return { visibleNav: visible, lockedNav: locked };
  }, [role, planId]);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-white/5 bg-[linear-gradient(180deg,#0F2744_0%,#0A1C31_55%,#06101C_100%)] text-white",
        collapsed ? "w-[80px]" : "w-[280px]"
      )}
    >
      <div className={cn("px-3 py-5", collapsed && "flex justify-center px-2")}>
        {collapsed ? (
          <KlirBuildLogo variant="mark" shape="circle" priority className="h-9 w-9" />
        ) : (
          <div className="flex flex-col items-start space-y-2">
            <KlirBuildLogo variant="full" priority className="h-[52px] w-[148px]" />
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
              Construction OS
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {visibleNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}

        {moduleNav.length > 0 &&
        canApp(role, "projects:read") &&
        routeAllowedForPlan(planId, "/construction") ? (
          <div className="pt-4">
            {!collapsed ? (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Modules
              </p>
            ) : null}
            {moduleNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        ) : null}

        {!collapsed && lockedNav.length > 0 ? (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setShowLocked((v) => !v)}
              className="mb-2 flex w-full items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45"
            >
              <span>Verrouillé ({lockedNav.length})</span>
              <Lock className="h-3 w-3" />
            </button>
            {showLocked
              ? lockedNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href="/billing"
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/40 hover:bg-white/5"
                      title={`Upgrade requis — ${item.label}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <Lock className="h-3 w-3" />
                    </Link>
                  );
                })
              : null}
          </div>
        ) : null}
      </nav>

      {!collapsed ? (
        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg bg-white/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-accent-300">
              <CalendarDays className="h-3.5 w-3.5" />
              Plan {plan.name}
            </div>
            <p className="text-xs text-white/75">
              {plan.maxUsers} users · accès filtrés par abonnement
            </p>
            {isCentralAdmin ? (
              <Link
                href="/billing"
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-accent-500 hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                Gérer l&apos;abonnement KlirBuild →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
