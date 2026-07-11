"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { clients as mockClients } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client } from "@/types";

const LOCAL_KEY = "klirbuild-extra-clients";

function readLocalClients(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as Client[];
  } catch {
    return [];
  }
}

function writeLocalClient(client: Client) {
  const existing = readLocalClients();
  localStorage.setItem(LOCAL_KEY, JSON.stringify([client, ...existing]));
}

function mergeClients(apiClients: Client[]): Client[] {
  const local = readLocalClients();
  const seen = new Set<string>();
  const merged: Client[] = [];
  for (const c of [...local, ...apiClients, ...mockClients]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    merged.push(c);
  }
  return merged;
}

export function ClientsPageClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (!res.ok) {
        setClients(mergeClients([]));
        return;
      }
      setClients(mergeClients(data.clients ?? []));
    } catch {
      setClients(mergeClients([]));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, industry, city }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Création échouée");
        return;
      }
      writeLocalClient(data.client);
      setName("");
      setEmail("");
      setPhone("");
      setIndustry("");
      setCity("");
      setShowForm(false);
      setMessage(`Client « ${data.client.name} » ajouté.`);
      await load();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Répertoire clients — ajoutez et gérez vos clients d'affaires."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Fermer" : "New client"}
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

      {showForm ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={createClient} className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Nom du client *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder="Courriel"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                placeholder="Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                placeholder="Industrie"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
              <Input
                placeholder="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Création…" : "Ajouter le client"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">LTV</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-t border-border hover:bg-slate-50/70 dark:hover:bg-slate-900/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {client.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3">{client.industry}</td>
                  <td className="px-4 py-3">{client.owner}</td>
                  <td className="px-4 py-3">{formatCurrency(client.lifetimeValue)}</td>
                  <td className="px-4 py-3">{formatDate(client.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
