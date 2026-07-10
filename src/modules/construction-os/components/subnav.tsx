"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardHat } from "lucide-react";
import { constructionNav } from "@/modules/construction-os/mock-data";
import { cn } from "@/lib/utils";

export function ConstructionSubnav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border bg-[linear-gradient(90deg,#1A365D,#0F2744)] px-4 py-3 text-white">
        <HardHat className="h-4 w-4 text-accent-500" />
        <div>
          <p className="text-sm font-semibold">Construction OS</p>
          <p className="text-[11px] text-white/70">
            ERP · CRM · IA · CCQ · Paiements · Marketing — PME Canada
          </p>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto p-2">
        {constructionNav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-brand-500 text-white"
                  : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-900"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
