"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { getPlan } from "@/lib/billing/plans";
import { moduleRegistry } from "@/modules/registry";
import { useSessionStore } from "@/lib/workforce/session";
import { apiUrl } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SettingsUsersPanel } from "@/components/settings/settings-users-panel";
import { SettingsCompanyPanel } from "@/components/settings/settings-company-panel";
import { SettingsRolesPanel } from "@/components/settings/settings-roles-panel";
import { ProductionSetupChecklist } from "@/components/settings/production-setup-checklist";

const tabs = [
  "Company",
  "Users",
  "Roles",
  "Branding",
  "Security",
  "Notifications",
  "API Keys",
  "Integrations",
  "Languages",
  "Subscription",
  "Modules",
  "Audit Logs",
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Company");
  const [enabledModules, setEnabledModules] = useState<string[]>(["construction-os", "crm"]);
  const [modulesSaving, setModulesSaving] = useState(false);
  const [modulesMessage, setModulesMessage] = useState("");
  const [brandingPrimary, setBrandingPrimary] = useState("#004F6E");
  const [brandingAccent, setBrandingAccent] = useState("#D4AF37");
  const planId = useSessionStore((s) => s.plan);
  const subscriptionStatus = useSessionStore((s) => s.subscriptionStatus);
  const setSessionModules = useSessionStore((s) => s.syncProfile);
  const plan = getPlan(planId);

  useEffect(() => {
    void fetch(apiUrl("/api/company"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.company?.enabledModules?.length) {
          setEnabledModules(d.company.enabledModules);
        }
        if (d.company?.brandingPrimary) setBrandingPrimary(d.company.brandingPrimary);
        if (d.company?.brandingAccent) setBrandingAccent(d.company.brandingAccent);
      });
  }, []);

  async function toggleModule(id: string) {
    const next = enabledModules.includes(id)
      ? enabledModules.filter((m) => m !== id)
      : [...enabledModules, id];
    setEnabledModules(next);
    setModulesSaving(true);
    setModulesMessage("");
    try {
      const res = await fetch(apiUrl("/api/company"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledModules: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModulesMessage(data.error ?? "Enregistrement échoué.");
        setEnabledModules(enabledModules);
        return;
      }
      if (data.company?.enabledModules) {
        setEnabledModules(data.company.enabledModules);
        setSessionModules({ enabledModules: data.company.enabledModules });
      }
      setModulesMessage("Modules mis à jour.");
    } catch {
      setModulesMessage("Erreur réseau.");
      setEnabledModules(enabledModules);
    } finally {
      setModulesSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Organization, access, billing, and module flags."
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex gap-2 overflow-x-auto lg:w-52 lg:flex-col">
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap",
                tab === item
                  ? "bg-brand-500 text-white"
                  : "hover:bg-slate-100 dark:hover:bg-slate-900"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{tab}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tab === "Company" ? <SettingsCompanyPanel /> : null}

            {tab === "Users" ? <SettingsUsersPanel /> : null}

            {tab === "Roles" ? <SettingsRolesPanel /> : null}

            {tab === "Branding" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Primary</p>
                  <Input
                    type="color"
                    value={brandingPrimary}
                    onChange={(e) => setBrandingPrimary(e.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Accent</p>
                  <Input
                    type="color"
                    value={brandingAccent}
                    onChange={(e) => setBrandingAccent(e.target.value)}
                  />
                </div>
                <Button
                  className="w-fit"
                  onClick={() =>
                    void fetch(apiUrl("/api/company"), {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ brandingPrimary, brandingAccent }),
                    })
                  }
                >
                  Save branding
                </Button>
              </div>
            ) : null}

            {tab === "Security" ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Password change, session list, and 2FA placeholder.</p>
                <Button variant="outline">Rotate sessions</Button>
              </div>
            ) : null}

            {tab === "Notifications" ? (
              <div className="space-y-2 text-sm">
                {["Invoice overdue", "New lead", "Task assigned", "AI digests"].map(
                  (item) => (
                    <label
                      key={item}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <span>{item}</span>
                      <input type="checkbox" defaultChecked className="h-4 w-4" />
                    </label>
                  )
                )}
              </div>
            ) : null}

            {tab === "Integrations" ? <ProductionSetupChecklist /> : null}

            {tab === "API Keys" ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate hashed keys for future public API / SDK.
                </p>
                <Button>Create API key</Button>
              </div>
            ) : null}

            {tab === "Integrations" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4 sm:col-span-2">
                  <p className="font-medium">Courriel par entreprise</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chaque compte entreprise envoie les soumissions, factures et invitations
                    au nom de son organisation. Configurez l&apos;identité dans l&apos;onglet
                    Company. La plateforme utilise Resend (RESEND_API_KEY sur Vercel).
                  </p>
                  <p className="mt-2 text-xs">
                    <a href="/inbox" className="text-brand-600 hover:underline">
                      Ouvrir la boîte courriel →
                    </a>
                  </p>
                </div>
                {["Stripe", "Google OAuth", "OpenAI"].map((name) => (
                  <div key={name} className="rounded-lg border border-border p-4">
                    <p className="font-medium">{name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Configure via environment variables
                    </p>
                    <StatusBadge status="pending" />
                  </div>
                ))}
              </div>
            ) : null}

            {tab === "Languages" ? (
              <div className="space-y-2 text-sm">
                <p>EN default · FR-ready i18n structure.</p>
                <Button variant="outline">English</Button>
                <Button variant="ghost">Français</Button>
              </div>
            ) : null}

            {tab === "Subscription" ? (
              <div className="space-y-3 text-sm">
                <p>
                  Plan: <strong>{plan.name}</strong> · {subscriptionStatus}
                </p>
                <p className="text-muted-foreground">
                  {plan.maxUsers === 9999 ? "Illimité" : plan.maxUsers} utilisateurs ·{" "}
                  {plan.features.length} modules inclus
                </p>
                <div className="flex gap-2">
                  <Link href="/billing">
                    <Button>Gérer l&apos;abonnement</Button>
                  </Link>
                  <Button variant="outline">Customer portal</Button>
                </div>
              </div>
            ) : null}

            {tab === "Modules" ? (
              <div className="space-y-3">
                {modulesMessage ? (
                  <p className="text-sm text-muted-foreground">{modulesMessage}</p>
                ) : null}
                {moduleRegistry.map((mod) => {
                  const on = enabledModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="font-medium">{mod.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {mod.description}
                        </p>
                      </div>
                      <Button
                        variant={on ? "default" : "outline"}
                        disabled={modulesSaving}
                        onClick={() => void toggleModule(mod.id)}
                      >
                        {on ? "Enabled" : "Enable"}
                      </Button>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Modules enregistrés dans Company.enabledModules (Postgres).
                </p>
              </div>
            ) : null}

            {tab === "Audit Logs" ? (
              <div className="space-y-2 text-sm">
                {[
                  "Alex Rivera invited sam@klirline.demo",
                  "Invoice INV-2026-097 marked overdue",
                  "Growth plan trial started",
                ].map((row) => (
                  <div key={row} className="rounded-lg border border-border p-3">
                    {row}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
