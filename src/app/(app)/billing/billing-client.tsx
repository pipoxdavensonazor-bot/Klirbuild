"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CreditCard, ExternalLink, Loader2, Smartphone, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatPlanPrice,
  getPlan,
  subscriptionPlans,
  type SubscriptionPlanId,
} from "@/lib/billing/plans";
import { apiUrl } from "@/lib/api-client";
import { EnterpriseContactForm } from "@/components/billing/enterprise-contact-form";
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

type MonCashStatus = {
  configured: boolean;
  env: "sandbox" | "live" | null;
  label: string;
};

type PayMethod = "stripe" | "moncash";

export default function BillingPage() {
  const searchParams = useSearchParams();
  const planId = useSessionStore((s) => s.plan);
  const billingCycle = useSessionStore((s) => s.billingCycle);
  const subscriptionStatus = useSessionStore((s) => s.subscriptionStatus);
  const stripeCustomerId = useSessionStore((s) => s.stripeCustomerId);
  const setPlan = useSessionStore((s) => s.setPlan);
  const setBillingCycle = useSessionStore((s) => s.setBillingCycle);
  const syncBilling = useSessionStore((s) => s.syncBilling);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [moncashStatus, setMoncashStatus] = useState<MonCashStatus | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("stripe");
  const [enterpriseFormOpen, setEnterpriseFormOpen] = useState(false);
  const current = getPlan(planId);

  useEffect(() => {
    fetch(apiUrl("/api/billing/subscription"), { credentials: "include" })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent("/billing")}`;
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d?.plan) return;
        syncBilling({
          plan: d.plan,
          billingCycle: d.billingCycle,
          subscriptionStatus: d.subscriptionStatus,
          stripeCustomerId: d.stripeCustomerId,
        });
      })
      .catch(() => undefined);
  }, [syncBilling]);

  useEffect(() => {
    fetch(apiUrl("/api/stripe/status"))
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
    fetch(apiUrl("/api/billing/moncash/status"))
      .then((r) => r.json())
      .then((d: MonCashStatus) => {
        setMoncashStatus(d);
        if (d?.configured) setPayMethod((prev) => prev);
      })
      .catch(() =>
        setMoncashStatus({ configured: false, env: null, label: "MonCash" })
      );
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    const moncash = searchParams.get("moncash");
    const orderId = searchParams.get("orderId");
    const token = searchParams.get("token");

    if (moncash === "1" && orderId) {
      setMessage("Vérification du paiement MonCash…");
      fetch(apiUrl("/api/billing/moncash/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, token }),
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) {
            throw new Error(d.error || d.message || "Paiement MonCash non confirmé");
          }
          return d;
        })
        .then((d) => {
          if (d.ok && d.plan) {
            syncBilling({
              plan: d.plan,
              billingCycle: d.billingCycle,
              subscriptionStatus: d.subscriptionStatus,
            });
            setMessage(
              `Abonnement ${getPlan(d.plan).name} activé via MonCash${
                d.amountHtg ? ` (${d.amountHtg} HTG)` : ""
              }.`
            );
            setError("");
            sessionStorage.removeItem("klir_moncash_plan");
          } else {
            setError(d.message || d.error || "Paiement MonCash non confirmé");
          }
        })
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Erreur vérification MonCash")
        );
      return;
    }

    // Retour Digicel sans query orderId — reprendre depuis sessionStorage
    if (moncash === "1" || searchParams.get("transactionId") || searchParams.get("transaction_id")) {
      try {
        const raw = sessionStorage.getItem("klir_moncash_plan");
        if (raw) {
          const saved = JSON.parse(raw) as { orderId?: string; token?: string };
          if (saved.orderId) {
            setMessage("Vérification du paiement MonCash…");
            fetch(apiUrl("/api/billing/moncash/verify"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                orderId: saved.orderId,
                token: saved.token,
              }),
            })
              .then(async (r) => {
                const d = await r.json();
                if (!r.ok) {
                  throw new Error(d.error || d.message || "Paiement MonCash non confirmé");
                }
                return d;
              })
              .then((d) => {
                if (d.ok && d.plan) {
                  syncBilling({
                    plan: d.plan,
                    billingCycle: d.billingCycle,
                    subscriptionStatus: d.subscriptionStatus,
                  });
                  setMessage(
                    `Abonnement ${getPlan(d.plan).name} activé via MonCash${
                      d.amountHtg ? ` (${d.amountHtg} HTG)` : ""
                    }.`
                  );
                  setError("");
                  sessionStorage.removeItem("klir_moncash_plan");
                } else {
                  setError(d.message || d.error || "Paiement MonCash non confirmé");
                }
              })
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Erreur vérification MonCash"
                )
              );
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    if (checkout === "success" && sessionId) {
      fetch(
        apiUrl(
          `/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId)}`
        ),
        { credentials: "include" }
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.plan) {
            syncBilling({
              plan: d.plan,
              billingCycle: d.billingCycle,
              subscriptionStatus: d.subscriptionStatus,
              stripeCustomerId: d.stripeCustomerId,
            });
            setMessage(
              `Abonnement ${getPlan(d.plan).name} activé — essai 14 jours ou paiement confirmé.`
            );
          } else {
            setError(d.error || "Impossible de confirmer le paiement");
          }
        })
        .catch(() => setError("Erreur lors de la confirmation Stripe"));
    } else if (checkout === "success") {
      setMessage("Paiement réussi. Actualisez si le plan ne se met pas à jour.");
    } else if (checkout === "cancel") {
      setError("Checkout annulé — aucun paiement effectué.");
    }
  }, [searchParams, syncBilling]);

  async function openPortal() {
    setError("");
    setPortalLoading(true);
    try {
      const res = await fetch(apiUrl("/api/stripe/portal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent("/billing")}`;
          return;
        }
        setError(data.error || "Portail indisponible");
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setPortalLoading(false);
    }
  }

  async function selectPlan(id: SubscriptionPlanId) {
    setError("");
    setMessage("");

    if (id === "enterprise") {
      setEnterpriseFormOpen(true);
      return;
    }

    if (payMethod === "moncash") {
      if (moncashStatus && !moncashStatus.configured) {
        setError(
          "MonCash n'est pas configuré. Ajoutez MONCASH_CLIENT_ID / MONCASH_CLIENT_SECRET, ou choisissez Stripe."
        );
        return;
      }
      setLoadingPlan(id);
      try {
        const res = await fetch(apiUrl("/api/billing/moncash/checkout"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan: id, cycle: billingCycle }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = `/login?next=${encodeURIComponent("/billing")}`;
            return;
          }
          setError(data.error || "Erreur MonCash");
          return;
        }
        if (data.token) {
          sessionStorage.setItem(
            "klir_moncash_plan",
            JSON.stringify({
              orderId: data.orderId,
              token: data.token,
              returnUrl: data.returnUrl,
            })
          );
        }
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
          return;
        }
        setError("URL MonCash manquante");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur réseau");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    if (stripeStatus?.configured !== false) {
      if (stripeStatus && !stripeStatus.connected && !stripeStatus.configured) {
        setError("Paiement indisponible — Stripe n'est pas connecté. Contactez le support.");
        return;
      }
      setLoadingPlan(id);
      try {
        const res = await fetch(apiUrl("/api/stripe/checkout"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            plan: id,
            cycle: billingCycle,
            customerId: stripeCustomerId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = `/login?next=${encodeURIComponent("/billing")}`;
            return;
          }
          setError(data.error || "Erreur Checkout");
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

    if (moncashStatus?.configured) {
      setPayMethod("moncash");
      setError("Stripe indisponible — basculez sur MonCash puis réessayez.");
      return;
    }

    setError("Paiement indisponible — configurez Stripe ou MonCash.");
  }

  return (
    <div>
      <EnterpriseContactForm
        open={enterpriseFormOpen}
        onClose={() => setEnterpriseFormOpen(false)}
        onSent={setMessage}
        onError={setError}
      />
      <PageHeader
        title="Abonnements KlirBuild"
        description="Choisissez un plan. Payez par carte (Stripe) ou MonCash Digicel (Haïti)."
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
        <CardContent className="flex flex-col gap-3 p-4 text-sm">
          <p className="font-medium">Mode de paiement</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPayMethod("stripe")}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition",
                payMethod === "stripe"
                  ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30"
                  : "border-border hover:border-brand-300"
              )}
            >
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span>
                <span className="block font-medium">Stripe</span>
                <span className="text-xs text-muted-foreground">
                  Carte · Interac · Apple Pay · abonnement récurrent
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("moncash")}
              disabled={moncashStatus?.configured === false}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition",
                payMethod === "moncash"
                  ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30"
                  : "border-border hover:border-brand-300",
                moncashStatus?.configured === false && "cursor-not-allowed opacity-50"
              )}
            >
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span>
                <span className="block font-medium">MonCash</span>
                <span className="text-xs text-muted-foreground">
                  Digicel Haïti · paiement mobile en HTG
                  {moncashStatus?.configured
                    ? ` · ${moncashStatus.env || "sandbox"}`
                    : " · non configuré"}
                </span>
              </span>
            </button>
          </div>
          {payMethod === "moncash" ? (
            <p className="text-xs text-muted-foreground">
              MonCash active le plan pour 1 mois ou 1 an (paiement unique). Le renouvellement se
              fait manuellement.
            </p>
          ) : null}
        </CardContent>
      </Card>

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
              <li>
                Guide complet :{" "}
                <code className="rounded bg-muted px-1">STRIPE_SETUP.md</code> à la racine
              </li>
              <li>
                Clés test :{" "}
                <a
                  href="https://dashboard.stripe.com/test/apikeys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  dashboard.stripe.com/test/apikeys
                </a>
              </li>
              <li>
                Collez <code>sk_test_</code> + <code>pk_test_</code> dans{" "}
                <code>.env.local</code>
              </li>
              <li>
                Terminal : <code>npm run stripe:setup</code> puis{" "}
                <code>npm run stripe:verify</code>
              </li>
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
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              Statut : {subscriptionStatus.replace("_", " ")}
              {stripeCustomerId ? " · Client Stripe lié" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right text-sm">
            <div>
              <p>
                {current.maxUsers === 9999 ? "Illimité" : current.maxUsers}{" "}
                utilisateurs
              </p>
              <p>
                {current.maxJobs === 9999 ? "Illimité" : current.maxJobs} chantiers
              </p>
              <p>
                {current.maxClients === 9999 ? "Illimité" : current.maxClients}{" "}
                clients
              </p>
              <p>
                {current.maxProjects === 9999 ? "Illimité" : current.maxProjects}{" "}
                projets
              </p>
              <p>
                {current.maxInvoices === 9999 ? "Illimité" : current.maxInvoices}{" "}
                factures
              </p>
              <p>{current.maxStorageGb} Go stockage</p>
            </div>
            {stripeCustomerId && stripeStatus?.connected ? (
              <Button
                variant="outline"
                size="sm"
                disabled={portalLoading}
                onClick={openPortal}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gérer l&apos;abonnement
              </Button>
            ) : null}
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
                          {payMethod === "moncash"
                            ? "Redirection MonCash…"
                            : "Redirection Stripe…"}
                        </>
                      ) : plan.id === "enterprise" ? (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Nous contacter
                        </>
                      ) : payMethod === "moncash" ? (
                        moncashStatus?.configured ? (
                          `Payer MonCash — ${plan.name}`
                        ) : (
                          `MonCash indisponible`
                        )
                      ) : stripeStatus?.connected ? (
                        `Payer — ${plan.name}`
                      ) : stripeStatus?.configured ? (
                        `Configurer Stripe`
                      ) : (
                        `Choisir ${plan.name}`
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
