"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, Camera, Save, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { employees } from "@/lib/workforce/mock-data";
import { useSessionStore } from "@/lib/workforce/session";
import { roleLabelFr } from "@/lib/workforce/roles";
import { getMarket, marketProfiles, type MarketRegionId } from "@/lib/markets/regions";
import { SettingsCompanyPanel } from "@/components/settings/settings-company-panel";

type CompanyProfile = {
  name: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  emailFrom: string;
  inboxEmail: string;
  emailSenderName: string;
  brandingPrimary: string;
  brandingAccent: string;
};

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "KB";
}

export function ProfilePageClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const role = useSessionStore((s) => s.role);
  const employeeId = useSessionStore((s) => s.employeeId);
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const setMarketRegion = useSessionStore((s) => s.setMarketRegion);
  const employee = employees.find((e) => e.id === employeeId) ?? employees[0];
  const market = getMarket(marketRegion);

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"profil" | "entreprise">("profil");

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/company"), { credentials: "include" });
    const data = await res.json();
    if (data.company) {
      setCompany({
        name: data.company.name ?? "",
        email: data.company.email ?? "",
        phone: data.company.phone ?? "",
        website: data.company.website ?? "",
        logoUrl: data.company.logoUrl ?? "",
        emailFrom: data.company.emailFrom ?? "",
        inboxEmail: data.company.inboxEmail ?? "",
        emailSenderName: data.company.emailSenderName ?? "",
        brandingPrimary: data.company.brandingPrimary ?? "#004F6E",
        brandingAccent: data.company.brandingAccent ?? "#D4AF37",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Choisissez une image (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image max 2 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setCompany((c) => (c ? { ...c, logoUrl: url } : c));
      setError("");
      setMessage("Logo chargé — cliquez Enregistrer pour sauvegarder.");
    };
    reader.readAsDataURL(file);
  }

  async function saveQuick() {
    if (!company) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(apiUrl("/api/company"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: company.name,
          logoUrl: company.logoUrl,
          brandingPrimary: company.brandingPrimary,
          brandingAccent: company.brandingAccent,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Sauvegarde échouée");
        return;
      }
      setMessage("Profil entreprise mis à jour.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Mon profil"
        description="Logo entreprise, paramètres rapides et identité."
        actions={
          <Link href="/settings">
            <Button variant="outline">Paramètres avancés</Button>
          </Link>
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Card className="mb-6 overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Cliquez pour changer le logo"
            className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-brand-300 bg-white shadow-md transition hover:border-brand-500 hover:ring-4 hover:ring-brand-100 dark:bg-slate-900"
          >
            {company?.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt={company.name}
                width={96}
                height={96}
                className="h-full w-full object-contain p-2"
                unoptimized
              />
            ) : (
              <span className="text-2xl font-bold text-brand-600">
                {companyInitials(company?.name ?? "KB")}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-8 w-8 text-white" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLogoFile(f);
            }}
          />

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{company?.name ?? "Chargement…"}</h2>
            <p className="text-sm text-muted-foreground">
              {employee.name} · {roleLabelFr(role)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cliquez sur le logo pour le modifier · {market.label}
            </p>
            {company ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  className="max-w-xs"
                  placeholder="Nom entreprise"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                />
                <Button disabled={saving} onClick={() => void saveQuick()}>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === "profil" ? "default" : "outline"}
          onClick={() => setTab("profil")}
        >
          <User className="h-4 w-4" />
          Mon compte
        </Button>
        <Button
          variant={tab === "entreprise" ? "default" : "outline"}
          onClick={() => setTab("entreprise")}
        >
          <Building2 className="h-4 w-4" />
          Entreprise & courriel
        </Button>
      </div>

      {tab === "profil" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paramètres rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Région / taxes</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={marketRegion}
                  onChange={(e) => setMarketRegion(e.target.value as MarketRegionId)}
                >
                  {marketProfiles.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Couleur principale</span>
                  <Input
                    type="color"
                    value={company?.brandingPrimary ?? "#004F6E"}
                    onChange={(e) =>
                      company && setCompany({ ...company, brandingPrimary: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Couleur accent</span>
                  <Input
                    type="color"
                    value={company?.brandingAccent ?? "#D4AF37"}
                    onChange={(e) =>
                      company && setCompany({ ...company, brandingAccent: e.target.value })
                    }
                  />
                </label>
              </div>
              <Button disabled={saving} onClick={() => void saveQuick()}>
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accès</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Rôle :</span>{" "}
                <strong>{roleLabelFr(role)}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Chronomètre & chat :</span> activés
              </p>
              <Link href="/settings" className="inline-block text-brand-600 hover:underline">
                Gérer utilisateurs et rôles →
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <SettingsCompanyPanel />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
