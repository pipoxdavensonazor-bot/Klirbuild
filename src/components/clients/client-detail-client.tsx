"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  activities,
  clients as mockClients,
  documents,
  invoices as mockInvoices,
  payments,
  projects,
  quotes as mockQuotes,
  tasks,
} from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Client } from "@/types";
import type { EmailRecord } from "@/lib/email/email-service";

export function ClientDetailClient({ id }: { id: string }) {
  const [client, setClient] = useState<Client | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);

  useEffect(() => {
    const mock = mockClients.find((c) => c.id === id) ?? null;
    setClient(mock);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.clients as Client[] | undefined)?.find((c) => c.id === id);
        if (found) setClient(found);
      })
      .catch(() => {});
    fetch(`/api/inbox?clientId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((data) => setEmails(data.emails ?? []))
      .catch(() => {});
  }, [id]);

  if (!client) {
    return <p className="p-8 text-sm text-muted-foreground">Client introuvable.</p>;
  }

  const clientQuotes = mockQuotes.filter((q) => q.clientId === id);
  const clientInvoices = mockInvoices.filter((i) => i.clientId === id);
  const clientProjects = projects.filter((p) => p.clientName === client.name);
  const clientPayments = payments.filter((p) => p.clientName === client.name);

  const tabs = [
    { title: "Documents", items: documents.slice(0, 2).map((d) => d.name) },
    {
      title: "Factures",
      items: clientInvoices.map((i) => `${i.number} · ${formatCurrency(i.total)}`),
    },
    {
      title: "Soumissions",
      items: clientQuotes.map((q) => `${q.number} · ${formatCurrency(q.total)}`),
    },
    {
      title: "Projets",
      items: clientProjects.map((p) => `${p.name} · ${p.progress}%`),
    },
    {
      title: "Tâches",
      items: tasks
        .filter((t) => clientProjects.some((p) => p.id === t.projectId))
        .map((t) => t.title),
    },
    {
      title: "Courriels",
      items: emails.map(
        (e) => `${e.direction === "inbound" ? "←" : "→"} ${e.subject}`
      ),
    },
    {
      title: "Paiements",
      items: clientPayments.map((p) => `${p.invoiceNumber} · ${formatCurrency(p.amount)}`),
    },
    {
      title: "Activité",
      items: activities.slice(0, 3).map((a) => a.title),
    },
  ];

  return (
    <div>
      <PageHeader
        title={client.name}
        description={`${client.city} · ${client.industry} · Responsable ${client.owner}`}
        actions={<StatusBadge status={client.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Courriel</p>
              <p className="font-medium">{client.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Téléphone</p>
              <p className="font-medium">{client.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valeur vie client</p>
              <p className="font-medium">{formatCurrency(client.lifetimeValue)}</p>
            </div>
            <Link href={`/inbox?clientId=${id}`} className="text-sm text-brand-600 hover:underline">
              Voir tous les courriels →
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          {tabs.map((tab) => (
            <Card key={tab.title}>
              <CardHeader>
                <CardTitle className="text-sm">{tab.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tab.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun élément</p>
                ) : (
                  tab.items.map((item) => (
                    <p key={item} className="rounded-md border border-border px-3 py-2 text-sm">
                      {item}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
