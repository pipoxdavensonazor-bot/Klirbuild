"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";

type HealthCheck = { ok: boolean; detail?: string };
type HealthPayload = { checks?: Record<string, HealthCheck> };

const INTEGRATIONS: {
  name: string;
  checkIds: string[];
  hint: string;
  pendingHint: string;
}[] = [
  {
    name: "Stripe",
    checkIds: ["stripe", "webhook"],
    hint: "Paiements, abonnements et factures clients",
    pendingHint: "Ajoutez STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY et STRIPE_WEBHOOK_SECRET sur Netlify.",
  },
  {
    name: "Google OAuth",
    checkIds: ["googleOAuth"],
    hint: "Connexion avec un compte Google",
    pendingHint:
      "Créez un client OAuth Google (Web) et ajoutez GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET via wrangler secret put. Redirect URI : https://klirline.app/api/auth/google/callback",
  },
  {
    name: "OpenAI",
    checkIds: ["openai"],
    hint: "Klir AI et IA chantier",
    pendingHint: "Ajoutez OPENAI_API_KEY sur Netlify pour activer les réponses intelligentes.",
  },
  {
    name: "Resend",
    checkIds: ["resend"],
    hint: "Courriels sortants (factures, invitations, inbox)",
    pendingHint: "Ajoutez RESEND_API_KEY et EMAIL_FROM=contact@klirline.ca sur Netlify.",
  },
];

export function IntegrationStatusCards() {
  const [checks, setChecks] = useState<Record<string, HealthCheck>>({});

  useEffect(() => {
    void fetch(apiUrl("/api/health"))
      .then((r) => r.json())
      .then((data: HealthPayload) => setChecks(data.checks ?? {}))
      .catch(() => setChecks({}));
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {INTEGRATIONS.map((item) => {
        const ok = item.checkIds.every((id) => checks[id]?.ok);
        const detail = item.checkIds
          .map((id) => checks[id]?.detail)
          .find(Boolean);
        return (
          <div key={item.name} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{item.name}</p>
              <StatusBadge status={ok ? "connected" : "pending"} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            {!ok ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                {detail ?? item.pendingHint}
              </p>
            ) : (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                Configuré et actif en production.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
