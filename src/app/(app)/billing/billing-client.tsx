"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatPlanPrice,
  getPlan,
  subscriptionPlans,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import { useSessionStore } from "@/lib/workforce/session";
import { cn } from "@/lib/utils";

type StripeStatus = {
  configured: boolean;
  connected: boolean;
  connectionError: string | null;
  prices: Record<string, boolean>;
  pricesReady: number;
  pricesTotal: number;
  modeHint: string;
};

export default function BillingPage() {
  const searchParams = useSearchParams();
  const planId = useSessionStore((s) => s.plan);
  const billingCycle = useSessionStore((s) => s.billingCycle);
  const setPlan = useSessionStore((s) => s.setPlan);
  const setBillingCycle = useSessionStore((s) => s.setBillingCycle);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const current = getPlan(planId);

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((r) => r.json())
      .then((d) => setStripeStatus(d))
      .catch(() =>
        setStripeStatus({
          configured: false,
          connected: false,
          connectionError: "Impossible de joindre /api/stripe/status",
          prices: {},
          pricesReady: 0,
          pricesTotal: 6,
          modeHint: "unknown",
        })
      );
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setMessage(
        "Paiement Stripe réussi (ou essai démarré). Le webhook confirmera l'abonnement."
      );
    } else if (checkout === "cancel") {
      setError("Checkout annulé — aucun paiement effectué.");
    }
  }, [searchParams]);

  async function selectPlan(id: SubscriptionPlanId) {
    setError("");
    setMessage("");

    if (id === "enterprise") {
      setMessage("Contactez Contact@klirline.ca pour un devis Enterprise.");
      return;
    }

    if (stripeStatus?.configured && stripeStatus.connected) {
      setLoadingPlan(id);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: id,
            cycle: billingCycle,
            email: "billing@klirline.demo",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Erreur Checkout");
          if (res.status === 400 || res.status === 503) {
            setPlan(id);
            setMessage(
              `Plan ${getPlan(id).name} activé en mode démo (Stripe: ${data.error}).`
            );
          }
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError("URL Checkout manquante");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur réseau");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    setPlan(id);
    setMessage(
      `Plan ${getPlan(id).name} activé (démo). Ajoutez STRIPE_SECRET_KEY + Price IDs dans .env.local pour payer réellement.`
    );
  }

  return (
    <div>
      <PageHeader
        title="Abonnements KlirBuild"
        description="Choisissez un plan. Paiement via Stripe Checkout (cartes + méthodes activées dans le Dashboard)."
        actions={
          <div className="flex rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                billingCycle === "monthly"
                  ? "bg-brand-500 text-white"
                  : "text-muted-foreground"
              )}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                billingCycle === "yearly"
                  ? "bg-brand-500 text-white"
                  : "text-muted-foreground"
              )}
            >
              Annuel (−17%)
            </button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-2 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-500" />
              <span>
                Stripe:{" "}
                <strong>
                  {!stripeStatus
                    ? "vérification…"
                    : stripeStatus.connected
                      ? `connecté (${stripeStatus.modeHint})`
                      : stripeStatus.configured
                        ? "clé présente — connexion refusée"
                        : "non configuré"}
                </strong>
              </span>
            </div>
            {stripeStatus?.pricesReady != null ? (
              <span className="text-xs text-muted-foreground">
                Price IDs: {stripeStatus.pricesReady}/{stripeStatus.pricesTotal}
              </span>
            ) : null}
          </div>
          {stripeStatus?.connectionError ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              {stripeStatus.connectionError}
            </p>
          ) : null}
          {!stripeStatus?.configured ? (
            <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Ouvrez Stripe Dashboard en mode <strong>Test</strong></li>
              <li>Developers → API keys → copiez <code>sk_test_…</code></li>
              <li>Collez dans <code>.env.local</code> → <code>STRIPE_SECRET_KEY=</code></li>
              <li>Créez 3 produits + 6 prix → collez les <code>price_…</code></li>
              <li>Redémarrez <code>npm run dev</code></li>
            </ol>
          ) : null}
        </CardContent>
      </Card>

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-muted-foreground">Plan actuel</p>
            <p className="text-xl font-semibold">{current.name}</p>
            <p className="text-sm text-muted-foreground">{current.tagline}</p>
          </div>
          <div className="text-right text-sm">
            <p>
              {current.maxUsers === 9999 ? "Illimité" : current.maxUsers}{" "}
              utilisateurs
            </p>
            <p>
              {current.maxJobs === 9999 ? "Illimité" : current.maxJobs} chantiers
            </p>
            <p>{current.maxStorageGb} Go stockage</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {subscriptionPlans.map((plan) => {
          const active = plan.id === planId;
          const busy = loadingPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.popular && "border-brand-400 shadow-soft",
                active && "ring-2 ring-brand-500"
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-2.5 left-4 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-brand-900">
                  POPULAIRE
                </span>
              ) : null}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="pt-2 text-3xl font-semibold tracking-tight">
                  {formatPlanPrice(plan, billingCycle)}
                  {plan.id !== "enterprise" ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{billingCycle === "monthly" ? "mois" : "an"}
                    </span>
                  ) : null}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ul className="space-y-2 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  {active ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Plan actuel
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={Boolean(loadingPlan)}
                      onClick={() => selectPlan(plan.id)}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Redirection Stripe…
                        </>
                      ) : plan.id === "enterprise" ? (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Nous contacter
                        </>
                      ) : stripeStatus?.connected ? (
                        `Payer — ${plan.name}`
                      ) : stripeStatus?.configured ? (
                        `Configurer Stripe`
                      ) : (
                        `Choisir ${plan.name} (démo)`
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Accès limités par plan</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Module</th>
                <th className="py-2">Starter</th>
                <th className="py-2">Growth</th>
                <th className="py-2">Business</th>
                <th className="py-2">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["CRM / Clients", true, true, true, true],
                ["Devis & factures", true, true, true, true],
                ["Pointage GPS", true, true, true, true],
                ["Localisation live", false, true, true, true],
                ["Paie + T4", false, true, true, true],
                ["Comptabilité", false, true, true, true],
                ["Construction OS + CCQ", false, true, true, true],
                ["IA", false, true, true, true],
                ["Pubs réseaux", false, false, true, true],
                ["Automatisations", false, false, true, true],
                ["API", false, false, false, true],
              ].map(([label, ...flags]) => (
                <tr key={String(label)} className="border-t border-border">
                  <td className="py-2 font-medium">{label as string}</td>
                  {(flags as boolean[]).map((ok, i) => (
                    <td key={i} className="py-2">
                      {ok ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">
            Essai 14 jours via Stripe Checkout. Activez cartes / Interac / Apple Pay
            dans Stripe Dashboard → Payment methods.
          </p>
          <Link
            href="mailto:Contact@klirline.ca"
            className="mt-2 inline-block text-sm text-brand-600 hover:underline"
          >
            Questions? Contact@klirline.ca
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
