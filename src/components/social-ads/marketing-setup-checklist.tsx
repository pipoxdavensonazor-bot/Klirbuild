"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Key, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type HealthChecks = {
  database?: { ok: boolean; detail?: string };
  schema?: { ok: boolean; detail?: string };
  seed?: { ok: boolean; detail?: string };
  zernio?: { ok: boolean; detail?: string };
  appUrl?: { ok: boolean; detail?: string };
};

type Props = {
  error?: string;
  provider?: string;
  onRetry?: () => void;
};

export function MarketingSetupChecklist({ error, provider, onRetry }: Props) {
  const [checks, setChecks] = useState<HealthChecks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/health"));
        const data = await res.json();
        setChecks(data.checks ?? {});
      } catch {
        setChecks(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = [
    {
      id: "db",
      label: "Base de données (DATABASE_URL)",
      ok: checks?.database?.ok,
      detail: checks?.database?.detail ?? "Ajoutez DATABASE_URL sur Netlify",
      fix: "npx prisma db push",
    },
    {
      id: "schema",
      label: "Tables marketing (Prisma)",
      ok: checks?.schema?.ok,
      detail: checks?.schema?.detail ?? "Tables marketing — npm run db:push",
      fix: "npx prisma db push",
    },
    {
      id: "seed",
      label: "Données démo (seed)",
      ok: checks?.seed?.ok,
      detail: checks?.seed?.detail ?? "Exécutez npm run db:seed sur Neon",
      fix: "npm run db:seed",
    },
    {
      id: "zernio",
      label: "Zernio API (ZERNIO_API_KEY)",
      ok: provider === "zernio" || checks?.zernio?.ok,
      detail:
        provider === "zernio"
          ? "Actif"
          : checks?.zernio?.detail ?? "Ajoutez ZERNIO_API_KEY sur Netlify puis redéployez",
      fix: "Variables Netlify → Trigger deploy",
    },
    {
      id: "url",
      label: "URL production (NEXT_PUBLIC_APP_URL)",
      ok: checks?.appUrl?.ok,
      detail: checks?.appUrl?.detail ?? "https://www.klirline.app",
      fix: "Netlify → Environment variables",
    },
  ];

  const allOk = items.every((i) => i.ok);

  if (!error && allOk && !loading) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-4 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
            <AlertCircle className="h-4 w-4" />
            Configuration production requise
          </p>
          {error ? (
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">{error}</p>
          ) : null}
        </div>
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Réessayer
          </Button>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2 rounded-md border border-amber-100 bg-white/60 px-3 py-2 text-xs dark:border-amber-900/50 dark:bg-black/20"
          >
            {item.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : item.id === "zernio" ? (
              <Key className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            ) : (
              <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[#333] dark:text-[#eee]">{item.label}</p>
              <p className="text-muted-foreground">{item.detail}</p>
              {!item.ok ? (
                <p className="mt-0.5 font-mono text-[10px] text-brand-700">{item.fix}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
