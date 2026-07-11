"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types";

export function InvoicesPageClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/invoices");
    const data = await res.json();
    setInvoices(data.invoices ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const pending = invoices.filter((i) => ["pending", "sent"].includes(i.status)).length;
  const paid = invoices.filter((i) => i.status === "paid").length;

  async function sendInvoice(id: string) {
    setError("");
    setMessage("");
    setLoadingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Envoi échoué");
        return;
      }
      if (data.simulated && data.mailto) {
        window.open(data.mailto, "_blank");
        setMessage(`Courriel préparé pour ${data.to} (mode démo — configurez RESEND_API_KEY).`);
      } else {
        setMessage(`Facture envoyée à ${data.to}`);
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
        title="Factures"
        description="Émettez et envoyez vos factures aux clients par courriel."
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

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Payées" value={String(paid)} />
        <StatCard label="Ouvertes" value={String(pending)} />
        <StatCard label="En retard" value={String(overdue)} hint="Relance requise" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Facture</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Échéance</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{invoice.number}</td>
                <td className="px-4 py-3">{invoice.clientName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-4 py-3">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
                <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === invoice.id || invoice.status === "paid"}
                      onClick={() => sendInvoice(invoice.id)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Envoyer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Les factures sont envoyées par courriel. Historique visible dans{" "}
        <Link href="/inbox" className="text-brand-600 hover:underline">
          Boîte courriel
        </Link>
        .
      </p>
    </div>
  );
}
