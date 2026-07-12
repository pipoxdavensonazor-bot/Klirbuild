"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-client";
import { employees } from "@/lib/workforce/mock-data";
import { useSessionStore } from "@/lib/workforce/session";
import { roleLabelFr } from "@/lib/workforce/roles";
import { getMarket, marketProfiles, type MarketRegionId } from "@/lib/markets/regions";
import { cn } from "@/lib/utils";

type CompanyBrief = {
  name: string;
  logoUrl?: string | null;
};

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "KB";
}

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState<CompanyBrief>({ name: "KlirBuild" });
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const setMarketRegion = useSessionStore((s) => s.setMarketRegion);
  const employee = employees.find((e) => e.id === employeeId) ?? employees[0];
  const market = getMarket(marketRegion);

  const loadCompany = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/company"), { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.company?.name) {
        setCompany({
          name: data.company.name,
          logoUrl: data.company.logoUrl,
        });
      }
    } catch {
      /* demo fallback */
    }
  }, []);

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
      useSessionStore.persist.clearStorage();
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <Link
        href="/profile"
        title={`Profil — ${company.name}`}
        className="group flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-sm transition hover:border-brand-400 hover:ring-2 hover:ring-brand-200 dark:bg-slate-900"
      >
        {company.logoUrl ? (
          <Image
            src={company.logoUrl}
            alt={company.name}
            width={36}
            height={36}
            className="h-full w-full object-contain p-0.5"
            unoptimized
          />
        ) : (
          <span className="text-[10px] font-bold text-brand-700 group-hover:text-brand-500">
            {companyInitials(company.name)}
          </span>
        )}
      </Link>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2 transition hover:bg-slate-50 dark:hover:bg-slate-900"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          {employee?.avatarInitials ?? "AR"}
        </div>
        <div className="hidden leading-tight sm:block text-left">
          <p className="text-xs font-medium">{employee?.name ?? "Utilisateur"}</p>
          <p className="text-[10px] text-muted-foreground">{roleLabelFr(role)}</p>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-b border-border bg-slate-50/80 p-4 transition hover:bg-slate-100 dark:bg-slate-900/50"
          >
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg border border-border object-contain bg-white p-1"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
                {companyInitials(company.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{company.name}</p>
              <p className="text-xs text-muted-foreground">{employee?.name}</p>
              <p className="text-[10px] text-brand-600">Modifier le profil →</p>
            </div>
          </Link>

          <div className="p-3 space-y-3">
            <label className="block text-xs">
              <span className="mb-1 flex items-center gap-1 text-muted-foreground">
                <Building2 className="h-3 w-3" />
                Région fiscale
              </span>
              <select
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                value={marketRegion}
                onChange={(e) => setMarketRegion(e.target.value as MarketRegionId)}
              >
                {marketProfiles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[10px] text-muted-foreground">
              {market.currency} · taxes {market.taxLines.map((t) => t.code).join("+")}
            </p>

            <div className="space-y-1 border-t border-border pt-2">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                Mon profil & logo
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Paramètres complets
              </Link>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                Rôles & accès
              </Link>
            </div>

            <Button
              variant="outline"
              className="w-full"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
