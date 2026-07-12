"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client } from "@/types";

type PaymentRow = {
  id: string;
  clientName: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  invoiceNumber?: string;
  createdAt: string;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("virement");
  const [projectName, setProjectName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(apiUrl("/api/payments"), { credentials: "include" });
    const data = await parseApiResponse(res);
    if (res.ok) setPayments((data.payments as PaymentRow[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    fetch(apiUrl("/api/clients"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setClients([]));
  }, [load]);

  async function recordPayment() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/payments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId,
          amount: Number(amount),
          method,
          projectName: projectName || undefined,
          sendReceipt: true,
        }),
      });
      const data = (await parseApiResponse(res)) as {
        error?: string;
        receipt?: { delivered?: boolean; to?: string; error?: string };
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Enregistrement échoué");
        return;
      }
      setAmount("");
      setProjectName("");
      if (data.receipt?.delivered) {
        setMessage(`Paiement enregistré — reçu envoyé à ${data.receipt.to}`);
      } else if (data.receipt?.error) {
        setMessage(`Paiement enregistré, mais reçu non envoyé : ${data.receipt.error}`);
      } else {
        setMessage("Paiement enregistré.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader
        title="Paiements clients"
        description="Enregistrez les paiements reçus pour vos projets et envoyez un reçu par courriel."
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Paiements enregistrés" value={String(payments.length)} />
        <StatCard label="Total reçu" value={formatCurrency(totalReceived)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Nouveau paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Choisir un client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              placeholder="Montant reçu ($)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="Nom du projet (optionnel)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
              <option value="comptant">Comptant</option>
              <option value="carte">Carte</option>
            </select>
            <Button
              className="w-full"
              disabled={loading || !clientId || !amount}
              onClick={() => void recordPayment()}
            >
              Enregistrer et envoyer le reçu
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
            ) : (
              payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {p.clientName} · {formatCurrency(p.amount, p.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.invoiceNumber ? `Facture ${p.invoiceNumber} · ` : ""}
                      {p.method} · {formatDate(p.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
