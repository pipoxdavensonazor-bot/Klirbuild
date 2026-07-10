"use client";

import { useMemo, useState } from "react";
import { Check, Globe2, Languages } from "lucide-react";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/markets/currency";
import { t, localeLabels } from "@/lib/markets/i18n";
import {
  calcMarketTaxes,
  getMarket,
  marketProfiles,
  type MarketRegionId,
} from "@/lib/markets/regions";
import { useSessionStore } from "@/lib/workforce/session";
import { cn } from "@/lib/utils";

export default function MarketsPage() {
  return (
    <RequirePlan feature="markets" title="Marchés US · CA · Caraïbes">
      <MarketsInner />
    </RequirePlan>
  );
}

function MarketsInner() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const currency = useSessionStore((s) => s.currency);
  const locale = useSessionStore((s) => s.locale);
  const setMarketRegion = useSessionStore((s) => s.setMarketRegion);
  const setLocale = useSessionStore((s) => s.setLocale);
  const [demoSubtotal, setDemoSubtotal] = useState(10000);
  const market = getMarket(marketRegion);
  const tax = useMemo(
    () => calcMarketTaxes(demoSubtotal, marketRegion),
    [demoSubtotal, marketRegion]
  );

  const zones = [
    { id: "canada" as const, label: "Canada" },
    { id: "united_states" as const, label: "United States" },
    { id: "caribbean" as const, label: "Caribbean" },
  ];

  return (
    <div>
      <PageHeader
        title={t(locale, "markets")}
        description={t(locale, "uniquePitch")}
        actions={
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
            >
              {market.locales.map((l) => (
                <option key={l} value={l}>
                  {localeLabels[l]}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Marché actif" value={market.label} hint={market.country} />
        <StatCard label="Devise" value={currency} hint={market.timezone} />
        <StatCard
          label="Taxes"
          value={market.taxLines.map((x) => x.code).join(" + ")}
          hint={`${(market.taxLines.reduce((s, x) => s + x.rate, 0) * 100).toFixed(2)}%`}
        />
        <StatCard
          label="Retainage"
          value={`${market.retainageDefault * 100}%`}
          hint={market.invoiceLabel}
        />
      </div>

      {zones.map((zone) => (
        <div key={zone.id} className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Globe2 className="h-4 w-4" />
            {zone.label}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {marketProfiles
              .filter((m) => m.zone === zone.id)
              .map((m) => {
                const active = m.id === marketRegion;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMarketRegion(m.id as MarketRegionId)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      active
                        ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500 dark:bg-brand-900/20"
                        : "border-border bg-card hover:border-brand-300"
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{m.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.currency} · {m.defaultLocale.toUpperCase()}
                        </p>
                      </div>
                      {active ? <Check className="h-4 w-4 text-brand-500" /> : null}
                    </div>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {m.highlights.map((h) => (
                        <li key={h}>• {h}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calculateur fiscal — {market.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">
                Sous-total ({currency})
              </span>
              <input
                type="number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={demoSubtotal}
                onChange={(e) => setDemoSubtotal(Number(e.target.value) || 0)}
              />
            </label>
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{formatMoney(demoSubtotal, currency)}</span>
              </div>
              {tax.lines.map((line) => (
                <div key={line.code} className="flex justify-between">
                  <span>
                    {line.name} ({(line.rate * 100).toFixed(3).replace(/\.?0+$/, "")}%)
                  </span>
                  <span>{formatMoney(line.amount, currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Total TTC</span>
                <span>{formatMoney(tax.total, currency)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Appliqué automatiquement aux devis, factures et pay applications.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pourquoi c&apos;est unique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Les ERP construction US ignorent souvent les Caraïbes. Les outils
              canadiens s&apos;arrêtent à la CCQ. KlirBuild unifie{" "}
              <strong className="text-foreground">3 zones</strong> avec un seul
              cockpit : taxes locales, conformité, devises, ouragans, et Auto-Pilot.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Canada : TPS/TVQ/HST, CCQ, T4</li>
              <li>USA : sales tax état, OSHA, liens, W-2/1099, AIA pay apps</li>
              <li>Caraïbes : VAT/GCT/ITBIS/TCA, XCD/USD, permis, ouragans</li>
            </ul>
            <Button
              onClick={() => setMarketRegion(marketRegion)}
              variant="outline"
              className="w-full"
            >
              Profil {market.label} actif
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
