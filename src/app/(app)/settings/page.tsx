"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { demoCompany } from "@/lib/mock-data";
import { getPlan } from "@/lib/billing/plans";
import { moduleRegistry } from "@/modules/registry";
import { useSessionStore } from "@/lib/workforce/session";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SettingsUsersPanel } from "@/components/settings/settings-users-panel";
import { SettingsCompanyPanel } from "@/components/settings/settings-company-panel";

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
  const [enabledModules, setEnabledModules] = useState(demoCompany.enabledModules);
  const planId = useSessionStore((s) => s.plan);
  const plan = getPlan(planId);

  function toggleModule(id: string) {
    setEnabledModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
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

            {tab === "Roles" ? (
              <div className="space-y-2 text-sm">
                {["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "EMPLOYEE"].map(
                  (role) => (
                    <div
                      key={role}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <span className="font-medium">{role}</span>
                      <span className="text-muted-foreground">
                        Middleware + can(user, permission)
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : null}

            {tab === "Branding" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Primary</p>
                  <Input defaultValue={demoCompany.brandingPrimary} />
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Accent</p>
                  <Input defaultValue={demoCompany.brandingAccent} />
                </div>
                <Button className="w-fit">Save branding</Button>
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
                  Plan: <strong>{plan.name}</strong> ·{" "}
                  {demoCompany.subscriptionStatus}
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
                        onClick={() => toggleModule(mod.id)}
                      >
                        {on ? "Enabled" : "Enable"}
                      </Button>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Demo state only — persist to Company.enabledModules when DB is connected.
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
