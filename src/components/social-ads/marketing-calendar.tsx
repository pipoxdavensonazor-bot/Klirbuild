"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, type SocialAdCampaign, type SocialPlatform } from "@/lib/reports/types";

type Props = {
  campaigns: SocialAdCampaign[];
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function MarketingCalendar({ campaigns }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const scheduled = useMemo(() => {
    const map = new Map<string, SocialAdCampaign[]>();
    for (const c of campaigns) {
      const when = c.scheduledFor ?? c.startDate;
      if (!when) continue;
      const day = when.slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(c);
      map.set(day, list);
    }
    return map;
  }, [campaigns]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const total = daysInMonth(cursor);
  const firstWeekday = new Date(year, month, 1).getDay();
  const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const label = cursor.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });

  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < offset; i++) cells.push({ day: null, key: `e-${i}` });
  for (let d = 1; d <= total; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }

  return (
    <div className="rounded-lg border border-[#e8ecf0] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize text-[#2d3436]">{label}</h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (cell.day === null) {
            return <div key={cell.key} className="min-h-[72px] rounded-md bg-transparent" />;
          }
          const posts = scheduled.get(cell.key) ?? [];
          const today =
            new Date().toISOString().slice(0, 10) === cell.key;
          return (
            <div
              key={cell.key}
              className={cn(
                "min-h-[72px] rounded-md border border-[#eef1f4] p-1 text-left",
                today && "border-brand-400 bg-brand-50/40"
              )}
            >
              <span className="text-[10px] font-medium text-[#555]">{cell.day}</span>
              <div className="mt-0.5 space-y-0.5">
                {posts.slice(0, 2).map((p) => (
                  <div
                    key={p.id}
                    className="truncate rounded bg-[#f0f4ff] px-1 py-0.5 text-[9px] text-[#333]"
                    title={p.name}
                  >
                    {PLATFORM_LABELS[p.platform as SocialPlatform] ?? p.platform}
                  </div>
                ))}
                {posts.length > 2 ? (
                  <p className="text-[9px] text-muted-foreground">+{posts.length - 2}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        Calendrier style Metricool — publications planifiées et campagnes.
      </p>
    </div>
  );
}
