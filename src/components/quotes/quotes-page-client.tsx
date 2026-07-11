"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Quote } from "@/types";

export function QuotesPageClient() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/quotes");
    const data = await res.json();
    setQuotes(data.quotes ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function action(id: string, actionName: string) {
    setError("");
    setMessage("");
    setLoadingId(id);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action échouée");
        return;
      }
      if (actionName === "send") {
        if (data.simulated && data.mailto) {
          window.open(data.mailto, "_blank");
          setMessage(`Courriel préparé pour ${data.to} (mode démo — configurez RESEND_API_KEY).`);
        } else {
          setMessage(`Soumission envoyée à ${data.to}`);
        }
      } else if (actionName === "approve") {
        setMessage("Soumission approuvée.");
      } else if (actionName === "convert") {
        setMessage(`Facture ${data.invoice?.number} créée.`);
      }
      await load();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Soumissions"
        description="Créez, approuvez, envoyez et convertissez en factures."
      />

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

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Valide jusqu&apos;au</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{quote.number}</td>
                <td className="px-4 py-3">{quote.clientName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={quote.status} />
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(quote.total, quote.currency)}
                </td>
                <td className="px-4 py-3">{formatDate(quote.validUntil)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === quote.id}
                      onClick={() => action(quote.id, "send")}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Envoyer
                    </Button>
                    {quote.status !== "approved" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loadingId === quote.id}
                        onClick={() => action(quote.id, "approve")}
                      >
                        Approuver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={loadingId === quote.id}
                        onClick={() => action(quote.id, "convert")}
                      >
                        → Facture
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Les soumissions sont envoyées par courriel au client. Configurez{" "}
        <code className="font-mono">RESEND_API_KEY</code> pour l&apos;envoi automatique.
      </p>
      <div className="mt-4 flex gap-4">
        <Link href="/invoices" className="text-sm text-brand-600 hover:underline">
          Voir les factures →
        </Link>
        <Link href="/inbox" className="text-sm text-brand-600 hover:underline">
          <Mail className="mr-1 inline h-3.5 w-3.5" />
          Boîte courriel →
        </Link>
      </div>
    </div>
  );
}
