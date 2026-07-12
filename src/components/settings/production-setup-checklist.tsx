"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type HealthPayload = {
  status?: string;
  appUrl?: string | null;
  summary?: { core?: boolean; billing?: boolean; optional?: boolean };
  checks?: Record<string, { ok: boolean; detail?: string; tier?: string }>;
};

const NETLIFY_VARS: { key: string; hint: string; tier: "billing" | "optional" }[] = [
  { key: "STRIPE_SECRET_KEY", hint: "sk_test_ ou sk_live_", tier: "billing" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", hint: "pk_test_ ou pk_live_", tier: "billing" },
  { key: "STRIPE_WEBHOOK_SECRET", hint: "whsec_ depuis Stripe Dashboard", tier: "billing" },
  { key: "STRIPE_PRICE_STARTER_MONTHLY", hint: "npm run stripe:setup", tier: "billing" },
  { key: "STRIPE_PRICE_GROWTH_MONTHLY", hint: "npm run stripe:setup", tier: "billing" },
  { key: "STRIPE_PRICE_BUSINESS_MONTHLY", hint: "npm run stripe:setup", tier: "billing" },
  { key: "STRIPE_PRICE_STARTER_YEARLY", hint: "npm run stripe:setup", tier: "billing" },
  { key: "STRIPE_PRICE_GROWTH_YEARLY", hint: "npm run stripe:setup", tier: "billing" },
  { key: "STRIPE_PRICE_BUSINESS_YEARLY", hint: "npm run stripe:setup", tier: "billing" },
  { key: "BETTER_AUTH_SECRET", hint: "32+ caractères aléatoires", tier: "optional" },
  { key: "CRON_SECRET", hint: "Secret pour /api/cron/automations", tier: "optional" },
  { key: "ZERNIO_API_KEY", hint: "Marketing multi-réseaux", tier: "optional" },
  { key: "GOOGLE_CLIENT_ID", hint: "OAuth Google", tier: "optional" },
  { key: "GOOGLE_CLIENT_SECRET", hint: "OAuth Google", tier: "optional" },
  { key: "OPENAI_API_KEY", hint: "Klir AI en direct", tier: "optional" },
  { key: "RESEND_API_KEY", hint: "Courriels transactionnels", tier: "optional" },
];

export function ProductionSetupChecklist() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/health"));
      const data = (await res.json()) as HealthPayload;
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const checks = health?.checks ?? {};
  const runtimeItems = Object.entries(checks).map(([id, c]) => ({
    id,
    label: id,
    ok: c.ok,
    detail: c.detail,
    tier: c.tier ?? "optional",
  }));

  const billingMissing = runtimeItems.filter((i) => i.tier === "billing" && !i.ok);
  const optionalMissing = runtimeItems.filter((i) => i.tier === "optional" && !i.ok);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">État production</p>
          <p className="text-xs text-muted-foreground">
            {health?.status === "ready"
              ? "Prêt — core + facturation OK"
              : health?.status === "degraded"
                ? "Dégradé — ajoutez Stripe sur Netlify"
                : health?.status === "unavailable"
                  ? "Indisponible — base de données ou auth"
                  : "Chargement…"}
          </p>
          {health?.appUrl ? (
            <p className="mt-1 text-xs text-muted-foreground">URL : {health.appUrl}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      <div className="space-y-2">
        {runtimeItems
          .filter((i) => i.tier === "core" || i.tier === "billing")
          .map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                item.ok
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                  : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
              )}
            >
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div>
                <p className="font-medium capitalize">{item.label.replace(/([A-Z])/g, " $1")}</p>
                {item.detail ? (
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                ) : null}
              </div>
            </div>
          ))}
      </div>

      {billingMissing.length > 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4">
          <p className="mb-2 text-sm font-medium">Variables Netlify — facturation (Phase 1)</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {NETLIFY_VARS.filter((v) => v.tier === "billing").map((v) => (
              <li key={v.key}>
                <code className="rounded bg-muted px-1">{v.key}</code> — {v.hint}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs">
            Webhook Stripe :{" "}
            <code className="rounded bg-muted px-1">
              {(health?.appUrl ?? "https://www.klirline.app") + "/api/stripe/webhook"}
            </code>
          </p>
        </div>
      ) : null}

      {optionalMissing.length > 0 ? (
        <details className="rounded-lg border border-border p-4 text-sm">
          <summary className="cursor-pointer font-medium">
            Intégrations optionnelles ({optionalMissing.length} manquante(s))
          </summary>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {NETLIFY_VARS.filter((v) => v.tier === "optional").map((v) => (
              <li key={v.key}>
                <code className="rounded bg-muted px-1">{v.key}</code> — {v.hint}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
