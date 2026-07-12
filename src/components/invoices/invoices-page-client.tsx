"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Send } from "lucide-react";
import { DocumentFormCard } from "@/components/billing/document-form-card";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { clients as mockClients } from "@/lib/mock-data";
import type { LineItemInput } from "@/lib/tax/document-tax";
import { useSessionStore } from "@/lib/workforce/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Invoice } from "@/types";

export function InvoicesPageClient() {
  const marketRegion = useSessionStore((s) => s.marketRegion);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editItems, setEditItems] = useState<LineItemInput[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/invoices"), { credentials: "include" });
    const data = await res.json();
    setInvoices(data.invoices ?? []);
  }, []);

  useEffect(() => {
    load();
    fetch(apiUrl("/api/clients"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(d.clients?.length ? d.clients : mockClients))
      .catch(() => setClients(mockClients));
  }, [load]);

  const overdue = invoices.filter((i) => i.status === "overdue").length;
  const pending = invoices.filter((i) => ["pending", "sent"].includes(i.status)).length;
  const paid = invoices.filter((i) => i.status === "paid").length;

  function openCreate() {
    setEditingId(null);
    setEditClientId("");
    setEditItems([]);
    setFormOpen(true);
    setError("");
  }

  async function openEdit(invoice: Invoice) {
    if (invoice.status !== "draft") {
      setError("Seules les factures en brouillon peuvent être modifiées.");
      return;
    }
    setError("");
    setLoadingId(invoice.id);
    try {
      const res = await fetch(apiUrl(`/api/invoices/${invoice.id}`), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Chargement échoué");
        return;
      }
      setEditingId(invoice.id);
      setEditClientId(data.invoice?.clientId ?? invoice.clientId);
      setEditItems(data.items ?? []);
      setFormOpen(true);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingId(null);
    }
  }

  async function sendInvoice(id: string) {
    setError("");
    setMessage("");
    setLoadingId(id);
    try {
      const res = await fetch(apiUrl(`/api/invoices/${id}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "send" }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Envoi échoué");
        return;
      }
      if (data.simulated && data.mailto) {
        window.open(String(data.mailto), "_blank");
        setMessage(`Courriel préparé pour ${data.to} (mode démo).`);
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
        description="Créez, modifiez et envoyez vos factures aux clients."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle facture
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

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Payées" value={String(paid)} />
        <StatCard label="Ouvertes" value={String(pending)} />
        <StatCard label="En retard" value={String(overdue)} hint="Relance requise" />
      </div>

      {formOpen ? (
        <DocumentFormCard
          type="invoice"
          clients={clients}
          marketRegion={marketRegion}
          editingId={editingId}
          initialClientId={editClientId}
          initialItems={editItems}
          onSaved={async () => {
            setFormOpen(false);
            setMessage(editingId ? "Facture mise à jour." : "Facture créée.");
            await load();
          }}
          onCancel={() => setFormOpen(false)}
        />
      ) : null}

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
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Aucune facture. Créez-en une avec le bouton ci-dessus.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
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
                      {invoice.status === "draft" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loadingId === invoice.id}
                          onClick={() => void openEdit(invoice)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </Button>
                      ) : null}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Historique des envois dans{" "}
        <Link href="/inbox" className="text-brand-600 hover:underline">
          Boîte courriel
        </Link>
        .
      </p>
    </div>
  );
}
