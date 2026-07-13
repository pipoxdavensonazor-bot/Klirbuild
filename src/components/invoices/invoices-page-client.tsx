"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreditCard, Pencil, Plus, Repeat, Send } from "lucide-react";
import { DocumentFormCard } from "@/components/billing/document-form-card";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import type { LineItemInput } from "@/lib/tax/document-tax";
import { useSessionStore } from "@/lib/workforce/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Invoice } from "@/types";

type RecurringInvoice = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: string;
  interval: "weekly" | "monthly" | "quarterly" | "yearly";
  nextRunAt: string;
  lastRunAt: string | null;
};

export function InvoicesPageClient() {
  const searchParams = useSearchParams();
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
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringClientId, setRecurringClientId] = useState("");
  const [recurringName, setRecurringName] = useState("");
  const [recurringInterval, setRecurringInterval] =
    useState<RecurringInvoice["interval"]>("monthly");
  const [recurringDescription, setRecurringDescription] = useState("Services mensuels");
  const [recurringAmount, setRecurringAmount] = useState("0");

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/invoices"), { credentials: "include" });
    const data = await res.json();
    setInvoices(data.invoices ?? []);
  }, []);

  useEffect(() => {
    load();
    fetch(apiUrl("/api/clients"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setClients([]));
    fetch(apiUrl("/api/recurring-invoices"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setRecurringInvoices(d.recurringInvoices ?? []))
      .catch(() => setRecurringInvoices([]));
  }, [load]);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const sessionId = searchParams.get("session_id");
    if (paid === "cancel") {
      setMessage("Paiement Stripe annulé.");
      return;
    }
    if (paid === "success" && sessionId) {
      void fetch(
        apiUrl(`/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId)}`),
        { credentials: "include" }
      )
        .then(async (res) => {
          const data = await parseApiResponse(res);
          if (!res.ok) {
            setError(typeof data.error === "string" ? data.error : "Sync paiement échouée");
            return;
          }
          setMessage("Paiement Stripe reçu — facture marquée payée.");
          await load();
        })
        .catch(() => setError("Impossible de confirmer le paiement Stripe."));
    }
  }, [searchParams, load]);

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
        setMessage(
          data.paymentUrl
            ? `Courriel préparé pour ${data.to} — lien Stripe inclus.`
            : `Courriel préparé pour ${data.to}.`
        );
      } else {
        setMessage(
          data.paymentUrl
            ? `Facture envoyée à ${data.to} avec lien de paiement Stripe.`
            : `Facture envoyée à ${data.to}`
        );
      }
      await load();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingId(null);
    }
  }

  async function openStripeCheckout(id: string) {
    setError("");
    setMessage("");
    setLoadingId(id);
    try {
      const res = await fetch(apiUrl(`/api/invoices/${id}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "stripe_checkout" }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Checkout Stripe échoué");
        return;
      }
      if (typeof data.url === "string") {
        window.location.href = data.url;
        return;
      }
      setError("URL Stripe manquante.");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingId(null);
    }
  }

  async function createRecurringInvoice() {
    setError("");
    setMessage("");
    setLoadingId("recurring");
    try {
      const res = await fetch(apiUrl("/api/recurring-invoices"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId: recurringClientId,
          name: recurringName || "Facture récurrente",
          interval: recurringInterval,
          marketRegion,
          items: [
            {
              description: recurringDescription,
              quantity: 1,
              unitPrice: Number(recurringAmount),
            },
          ],
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Création échouée");
        return;
      }
      setMessage("Facture récurrente créée.");
      setRecurringOpen(false);
      setRecurringName("");
      setRecurringAmount("0");
      const list = await fetch(apiUrl("/api/recurring-invoices"), { credentials: "include" });
      const next = await list.json();
      setRecurringInvoices(next.recurringInvoices ?? []);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoadingId(null);
    }
  }

  async function setRecurringStatus(id: string, action: "pause" | "activate") {
    setError("");
    setLoadingId(id);
    try {
      const res = await fetch(apiUrl("/api/recurring-invoices"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, id }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Mise à jour échouée");
        return;
      }
      const list = await fetch(apiUrl("/api/recurring-invoices"), { credentials: "include" });
      const next = await list.json();
      setRecurringInvoices(next.recurringInvoices ?? []);
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setRecurringOpen((v) => !v)}>
              <Repeat className="h-4 w-4" />
              Récurrente
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle facture
            </Button>
          </div>
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

      {recurringOpen ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <Repeat className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold">Nouvelle facture récurrente</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={recurringClientId}
              onChange={(e) => setRecurringClientId(e.target.value)}
            >
              <option value="">Client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Nom"
              value={recurringName}
              onChange={(e) => setRecurringName(e.target.value)}
            />
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={recurringInterval}
              onChange={(e) => setRecurringInterval(e.target.value as RecurringInvoice["interval"])}
            >
              <option value="weekly">Hebdo</option>
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="yearly">Annuel</option>
            </select>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Description"
              value={recurringDescription}
              onChange={(e) => setRecurringDescription(e.target.value)}
            />
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              type="number"
              min="0"
              step="0.01"
              placeholder="Montant"
              value={recurringAmount}
              onChange={(e) => setRecurringAmount(e.target.value)}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button disabled={loadingId === "recurring"} onClick={() => void createRecurringInvoice()}>
              Créer la récurrence
            </Button>
            <Button variant="ghost" onClick={() => setRecurringOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {recurringInvoices.length > 0 ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-soft">
          <h2 className="mb-3 font-semibold">Factures récurrentes</h2>
          <div className="grid gap-2">
            {recurringInvoices.map((recurring) => (
              <div
                key={recurring.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{recurring.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {recurring.clientName} · {recurring.interval} · prochaine{" "}
                    {formatDate(recurring.nextRunAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={recurring.status} />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === recurring.id}
                    onClick={() =>
                      void setRecurringStatus(
                        recurring.id,
                        recurring.status === "active" ? "pause" : "activate"
                      )
                    }
                  >
                    {recurring.status === "active" ? "Pause" : "Activer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
                      {invoice.status !== "paid" && invoice.status !== "cancelled" ? (
                        <Button
                          size="sm"
                          disabled={loadingId === invoice.id}
                          onClick={() => void openStripeCheckout(invoice.id)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Payer en ligne
                        </Button>
                      ) : null}
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
