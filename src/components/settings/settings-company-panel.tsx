"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { apiUrl } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CompanyProfile = {
  name: string;
  email: string;
  phone: string;
  website: string;
  emailFrom: string;
  inboxEmail: string;
  emailSenderName: string;
  employerBn: string;
};

export function SettingsCompanyPanel() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/company"), { credentials: "include" });
    const data = await res.json();
    if (data.company) {
      setCompany({
        name: data.company.name ?? "",
        email: data.company.email ?? "",
        phone: data.company.phone ?? "",
        website: data.company.website ?? "",
        emailFrom: data.company.emailFrom ?? data.company.email ?? "",
        inboxEmail: data.company.inboxEmail ?? data.company.email ?? "",
        emailSenderName: data.company.emailSenderName ?? data.company.name ?? "",
        employerBn: data.company.employerBn ?? "",
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copyInbox() {
    if (!company?.inboxEmail) return;
    try {
      await navigator.clipboard.writeText(company.inboxEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Impossible de copier l'adresse.");
    }
  }

  async function save() {
    if (!company) return;
    setSaving(true);
    setMessage("");
    const res = await fetch(apiUrl("/api/company"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: company.name,
        email: company.email,
        phone: company.phone,
        website: company.website,
        emailFrom: company.emailFrom,
        emailSenderName: company.emailSenderName,
        employerBn: company.employerBn,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error ?? "Erreur lors de la sauvegarde.");
      return;
    }
    setMessage(
      "Profil entreprise synchronisé — les courriels partiront au nom de votre entreprise."
    );
    if (data.company) {
      setCompany({
        name: data.company.name ?? "",
        email: data.company.email ?? "",
        phone: data.company.phone ?? "",
        website: data.company.website ?? "",
        emailFrom: data.company.emailFrom ?? "",
        inboxEmail: data.company.inboxEmail ?? "",
        emailSenderName: data.company.emailSenderName ?? "",
        employerBn: data.company.employerBn ?? "",
      });
    }
  }

  if (!company) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Chaque entreprise a son propre profil courriel. Les soumissions, factures et
        invitations sont envoyées au nom de votre organisation, pas de Klirline.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Nom de l'entreprise"
          value={company.name}
          onChange={(e) => setCompany({ ...company, name: e.target.value })}
        />
        <Input
          placeholder="Courriel principal"
          value={company.email}
          onChange={(e) => setCompany({ ...company, email: e.target.value })}
        />
        <Input
          placeholder="Téléphone"
          value={company.phone}
          onChange={(e) => setCompany({ ...company, phone: e.target.value })}
        />
        <Input
          placeholder="Site web"
          value={company.website}
          onChange={(e) => setCompany({ ...company, website: e.target.value })}
        />
        <div className="sm:col-span-2">
          <p className="mb-1 text-xs text-muted-foreground">
            N° d&apos;entreprise ARC (BN) pour T4 — ex. 123456789RP0001
          </p>
          <Input
            placeholder="000000000RP0001"
            value={company.employerBn}
            onChange={(e) => setCompany({ ...company, employerBn: e.target.value })}
          />
        </div>
      </div>
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">Identité courriel (synchronisée)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Nom affiché aux clients</p>
            <Input
              value={company.emailSenderName}
              onChange={(e) =>
                setCompany({ ...company, emailSenderName: e.target.value })
              }
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Courriel d&apos;envoi</p>
            <Input
              value={company.emailFrom}
              onChange={(e) => setCompany({ ...company, emailFrom: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1 text-xs text-muted-foreground">
              Boîte de réception KlirBuild (dédiée)
            </p>
            <div className="flex gap-2">
              <Input value={company.inboxEmail} readOnly className="font-mono text-sm" />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={copyInbox}
                title="Copier l'adresse"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Adresse plateforme unique. Publiez-la auprès de vos clients, ou transférez
          votre courriel professionnel vers cette adresse pour recevoir les messages
          dans KlirBuild. Le nom affiché à l&apos;envoi reste celui de votre entreprise.
        </p>
      </div>
      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
      ) : null}
      <Button onClick={save} disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer l'entreprise"}
      </Button>
    </div>
  );
}
