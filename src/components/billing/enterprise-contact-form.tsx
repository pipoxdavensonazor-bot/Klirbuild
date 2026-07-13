"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { useSessionStore } from "@/lib/workforce/session";

type Props = {
  open: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
  onError: (message: string) => void;
};

export function EnterpriseContactForm({ open, onClose, onSent, onError }: Props) {
  const userEmail = useSessionStore((s) => s.userEmail);
  const [companyName, setCompanyName] = useState("");
  const [subject, setSubject] = useState("Demande plan Enterprise");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetch(apiUrl("/api/company"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.company?.name) setCompanyName(d.company.name);
      })
      .catch(() => undefined);
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError("");
    try {
      const res = await fetch(apiUrl("/api/billing/enterprise-inquiry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyName, subject, message }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        onError(typeof data.error === "string" ? data.error : "Envoi échoué");
        return;
      }
      onSent(
        `Demande envoyée à Contact@klirline.ca — nous vous répondrons sous 1 à 2 jours ouvrables.`
      );
      setMessage("");
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Plan Enterprise — nous contacter</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Décrivez votre besoin. Le message sera envoyé à notre équipe commerciale.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Nom de l&apos;entreprise
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex. Construction ABC inc."
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Objet de la demande
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex. Devis Enterprise — 50 utilisateurs"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nombre d'utilisateurs, chantiers, modules souhaités, délai…"
                required
                rows={5}
              />
            </div>
            {userEmail ? (
              <p className="text-xs text-muted-foreground">
                Réponse envoyée à : <strong>{userEmail}</strong>
              </p>
            ) : null}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  "Envoyer la demande"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
