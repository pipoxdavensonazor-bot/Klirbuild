"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { apiUrl } from "@/lib/api-client";

type Placement = {
  id: string;
  title: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl?: string | null;
};

export function SponsoredAdSlot({
  surface = "dashboard",
}: {
  surface?: "dashboard" | "feed" | "sidebar";
}) {
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    void fetch(apiUrl(`/api/sponsored-ads/serve?surface=${surface}`), {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.placement) setPlacement(data.placement);
      })
      .catch(() => {});
  }, [surface]);

  if (!placement) return null;

  async function onClick() {
    try {
      await fetch(apiUrl("/api/sponsored-ads/serve"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: placement!.id }),
      });
    } catch {
      /* ignore */
    }
    window.open(placement!.ctaUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <aside className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-4 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
        <Megaphone className="h-3.5 w-3.5" />
        Sponsorisé · KlirBuild Ads
      </div>
      <p className="text-xs text-muted-foreground">{placement.title}</p>
      <h3 className="mt-1 text-base font-semibold text-foreground">
        {placement.headline}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{placement.body}</p>
      <button
        type="button"
        onClick={() => void onClick()}
        className="mt-3 inline-flex items-center rounded-md bg-[#0F2744] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#163556]"
      >
        {placement.ctaLabel}
      </button>
    </aside>
  );
}
