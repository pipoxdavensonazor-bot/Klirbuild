import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  activities,
  clients,
  documents,
  invoices,
  payments,
  projects,
  quotes,
  tasks,
} from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = clients.find((c) => c.id === id);
  if (!client) notFound();

  const clientQuotes = quotes.filter((q) => q.clientId === id);
  const clientInvoices = invoices.filter((i) => i.clientId === id);
  const clientProjects = projects.filter((p) => p.clientName === client.name);
  const clientPayments = payments.filter((p) => p.clientName === client.name);

  const tabs = [
    { title: "Documents", items: documents.slice(0, 2).map((d) => d.name) },
    {
      title: "Invoices",
      items: clientInvoices.map((i) => `${i.number} · ${formatCurrency(i.total)}`),
    },
    {
      title: "Quotes",
      items: clientQuotes.map((q) => `${q.number} · ${formatCurrency(q.total)}`),
    },
    {
      title: "Projects",
      items: clientProjects.map((p) => `${p.name} · ${p.progress}%`),
    },
    {
      title: "Tasks",
      items: tasks
        .filter((t) => clientProjects.some((p) => p.id === t.projectId))
        .map((t) => t.title),
    },
    { title: "Emails", items: ["Follow-up draft (placeholder)", "Onboarding welcome"] },
    {
      title: "Payments",
      items: clientPayments.map((p) => `${p.invoiceNumber} · ${formatCurrency(p.amount)}`),
    },
    {
      title: "Activity",
      items: activities.slice(0, 3).map((a) => a.title),
    },
  ];

  return (
    <div>
      <PageHeader
        title={client.name}
        description={`${client.city} · ${client.industry} · Owner ${client.owner}`}
        actions={<StatusBadge status={client.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{client.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{client.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Lifetime value</p>
              <p className="font-medium">{formatCurrency(client.lifetimeValue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tags</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {client.tags.map((tag) => (
                  <StatusBadge key={tag} status={tag} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Customer since</p>
              <p className="font-medium">{formatDate(client.createdAt)}</p>
            </div>
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
                  <p className="text-sm text-muted-foreground">No items yet</p>
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
