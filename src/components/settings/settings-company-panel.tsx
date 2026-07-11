"use client";

import { useCallback, useEffect, useState } from "react";
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
};

export function SettingsCompanyPanel() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/company");
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
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!company) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(data.error ?? "Erreur lors de la sauvegarde.");
      return;
    }
    setMessage("Profil entreprise synchronisé — les courriels partiront au nom de votre entreprise.");
    if (data.company) {
      setCompany({
        name: data.company.name ?? "",
        email: data.company.email ?? "",
        phone: data.company.phone ?? "",
        website: data.company.website ?? "",
        emailFrom: data.company.emailFrom ?? "",
        inboxEmail: data.company.inboxEmail ?? "",
        emailSenderName: data.company.emailSenderName ?? "",
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
            <p className="mb-1 text-xs text-muted-foreground">Boîte de réception entreprise</p>
            <Input
              value={company.inboxEmail}
              onChange={(e) => setCompany({ ...company, inboxEmail: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Les réponses de vos clients sont acheminées vers votre boîte. Le nom affiché
          est celui de votre entreprise.
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
