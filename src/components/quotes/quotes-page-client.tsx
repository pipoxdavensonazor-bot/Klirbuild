"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Pencil, Plus, Send } from "lucide-react";
import { DocumentFormCard } from "@/components/billing/document-form-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import type { LineItemInput } from "@/lib/tax/document-tax";
import { useSessionStore } from "@/lib/workforce/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Quote } from "@/types";

export function QuotesPageClient() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editItems, setEditItems] = useState<LineItemInput[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/quotes"), { credentials: "include" });
    const data = await res.json();
    setQuotes(data.quotes ?? []);
  }, []);

  useEffect(() => {
    load();
    fetch(apiUrl("/api/clients"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setClients([]));
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setEditClientId("");
    setEditItems([]);
    setFormOpen(true);
    setError("");
  }

  async function openEdit(quote: Quote) {
    if (quote.status !== "draft") {
      setError("Seules les soumissions en brouillon peuvent être modifiées.");
      return;
    }
    setError("");
    setLoadingId(quote.id);
    try {
      const res = await fetch(apiUrl(`/api/quotes/${quote.id}`), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Chargement échoué");
        return;
      }
      setEditingId(quote.id);
      setEditClientId(data.quote?.clientId ?? quote.clientId);
      setEditItems(data.items ?? []);
      setFormOpen(true);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingId(null);
    }
  }

  async function action(id: string, actionName: string) {
    setError("");
    setMessage("");
    setLoadingId(id);
    try {
      const res = await fetch(apiUrl(`/api/quotes/${id}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: actionName }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Action échouée");
        return;
      }
      if (actionName === "send") {
        if (data.simulated && data.mailto) {
          window.open(String(data.mailto), "_blank");
          setMessage(`Courriel préparé pour ${data.to}.`);
        } else {
          setMessage(`Soumission envoyée à ${data.to}`);
        }
      } else if (actionName === "approve") {
        setMessage("Soumission approuvée.");
      } else if (actionName === "convert") {
        const inv = data.invoice as { number?: string } | undefined;
        setMessage(`Facture ${inv?.number ?? ""} créée.`);
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
        description="Créez, modifiez, approuvez, envoyez et convertissez en factures."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle soumission
          </Button>
        }
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

      {formOpen ? (
        <DocumentFormCard
          type="quote"
          clients={clients}
          marketRegion={marketRegion}
          editingId={editingId}
          initialClientId={editClientId}
          initialItems={editItems}
          onSaved={async () => {
            setFormOpen(false);
            setMessage(editingId ? "Soumission mise à jour." : "Soumission créée.");
            await load();
          }}
          onCancel={() => setFormOpen(false)}
        />
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
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Aucune soumission. Créez-en une avec le bouton ci-dessus.
                </td>
              </tr>
            ) : (
              quotes.map((quote) => (
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
                      {quote.status === "draft" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loadingId === quote.id}
                          onClick={() => void openEdit(quote)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </Button>
                      ) : null}
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
