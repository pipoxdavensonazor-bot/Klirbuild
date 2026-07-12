"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { clients as mockClients } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import type { Client, Invoice, Project, ProjectStatus, Quote } from "@/types";
import type { EmailRecord } from "@/lib/email/email-service";

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planifié" },
  { value: "active", label: "Actif" },
  { value: "on_hold", label: "En pause" },
  { value: "completed", label: "Terminé" },
];

export function ClientDetailClient({ id }: { id: string }) {
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const [quoteTotal, setQuoteTotal] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("Soumission de services");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [invoiceDesc, setInvoiceDesc] = useState("Services professionnels");
  const [projectName, setProjectName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const load = useCallback(async () => {
    try {
      const [invRes, quoRes, prjRes, mailRes] = await Promise.all([
        fetch(apiUrl("/api/invoices"), { credentials: "include" }),
        fetch(apiUrl("/api/quotes"), { credentials: "include" }),
        fetch(apiUrl(`/api/projects?clientId=${encodeURIComponent(id)}`), {
          credentials: "include",
        }),
        fetch(apiUrl(`/api/inbox?clientId=${encodeURIComponent(id)}`), {
          credentials: "include",
        }),
      ]);
      const [invData, quoData, prjData, mailData] = await Promise.all([
        parseApiResponse(invRes),
        parseApiResponse(quoRes),
        parseApiResponse(prjRes),
        parseApiResponse(mailRes),
      ]);
      setInvoices(
        ((invData.invoices as Invoice[] | undefined) ?? []).filter(
          (i) => i.clientId === id
        )
      );
      setQuotes(
        ((quoData.quotes as Quote[] | undefined) ?? []).filter((q) => q.clientId === id)
      );
      setProjects((prjData.projects as Project[] | undefined) ?? []);
      setEmails((mailData.emails as EmailRecord[] | undefined) ?? []);
    } catch {
      /* garde les données en cache */
    }
  }, [id]);

  useEffect(() => {
    const mock = mockClients.find((c) => c.id === id) ?? null;
    setClient(mock);
    fetch(apiUrl("/api/clients"), { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const found = (data.clients as Client[] | undefined)?.find((c) => c.id === id);
        if (found) setClient(found);
      })
      .catch(() => {});
    load();
  }, [id, load]);

  async function createQuote() {
    setError("");
    setMessage("");
    setLoading("create-quote");
    try {
      const res = await fetch(apiUrl("/api/quotes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId: id,
          total: Number(quoteTotal),
          description: quoteDesc,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Création échouée");
        return;
      }
      setShowQuoteForm(false);
      setQuoteTotal("");
      setMessage("Soumission créée.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(null);
    }
  }

  async function createInvoice() {
    setError("");
    setMessage("");
    setLoading("create-invoice");
    try {
      const res = await fetch(apiUrl("/api/invoices"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId: id,
          total: Number(invoiceTotal),
          description: invoiceDesc,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Création échouée");
        return;
      }
      setShowInvoiceForm(false);
      setInvoiceTotal("");
      setMessage("Facture créée.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(null);
    }
  }

  async function createProject() {
    setError("");
    setMessage("");
    setLoading("create-project");
    try {
      const res = await fetch(apiUrl("/api/projects"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId: id, name: projectName }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Création échouée");
        return;
      }
      setShowProjectForm(false);
      setProjectName("");
      setMessage("Projet créé.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(null);
    }
  }

  async function sendQuote(quoteId: string) {
    setError("");
    setMessage("");
    setLoading(`send-q-${quoteId}`);
    try {
      const res = await fetch(apiUrl(`/api/quotes/${quoteId}`), {
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
      if (data.simulated && typeof data.mailto === "string") {
        window.open(data.mailto, "_blank");
        setMessage(`Courriel préparé pour ${data.to}`);
      } else {
        setMessage(`Soumission envoyée à ${data.to}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(null);
    }
  }

  async function sendInvoice(invoiceId: string) {
    setError("");
    setMessage("");
    setLoading(`send-i-${invoiceId}`);
    try {
      const res = await fetch(apiUrl(`/api/invoices/${invoiceId}`), {
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
      if (data.simulated && typeof data.mailto === "string") {
        window.open(data.mailto, "_blank");
        setMessage(`Courriel préparé pour ${data.to}`);
      } else {
        setMessage(`Facture envoyée à ${data.to}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(null);
    }
  }

  async function updateProjectStatus(projectId: string, status: ProjectStatus) {
    setError("");
    try {
      const res = await fetch(apiUrl(`/api/projects/${projectId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Mise à jour échouée");
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    }
  }

  async function sendEmail() {
    setError("");
    setMessage("");
    setLoading("send-email");
    try {
      const res = await fetch(apiUrl("/api/inbox"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId: id,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Envoi échoué");
        return;
      }
      setShowEmailForm(false);
      setEmailSubject("");
      setEmailBody("");
      if (data.simulated && typeof data.mailto === "string") {
        window.open(data.mailto, "_blank");
        setMessage(`Courriel préparé pour ${data.to}`);
      } else {
        setMessage(`Courriel envoyé à ${data.to}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(null);
    }
  }

  if (!client) {
    return <p className="p-8 text-sm text-muted-foreground">Client introuvable.</p>;
  }

  const noEmail = !client.email?.trim();

  return (
    <div>
      <PageHeader
        title={client.name}
        description={`${client.city} · ${client.industry} · Responsable ${client.owner}`}
        actions={<StatusBadge status={client.status} />}
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
      {noEmail ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Ajoutez un courriel au profil client pour envoyer factures, soumissions et messages.
        </div>
      ) : null}

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
            <Link
              href={`/inbox?clientId=${id}`}
              className="text-sm text-brand-600 hover:underline"
            >
              Voir tous les courriels →
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
          {/* Soumissions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Soumissions</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowQuoteForm((v) => !v)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {showQuoteForm ? (
                <div className="space-y-2 rounded-md border border-dashed border-border p-2">
                  <Input
                    type="number"
                    placeholder="Montant ($)"
                    value={quoteTotal}
                    onChange={(e) => setQuoteTotal(e.target.value)}
                  />
                  <Input
                    placeholder="Description"
                    value={quoteDesc}
                    onChange={(e) => setQuoteDesc(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={loading === "create-quote" || !quoteTotal}
                    onClick={createQuote}
                  >
                    Créer la soumission
                  </Button>
                </div>
              ) : null}
              {quotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune soumission</p>
              ) : (
                quotes.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {q.number} · {formatCurrency(q.total)}
                      </p>
                      <StatusBadge status={q.status} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={noEmail || loading === `send-q-${q.id}`}
                      onClick={() => sendQuote(q.id)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Factures */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Factures</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInvoiceForm((v) => !v)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {showInvoiceForm ? (
                <div className="space-y-2 rounded-md border border-dashed border-border p-2">
                  <Input
                    type="number"
                    placeholder="Montant ($)"
                    value={invoiceTotal}
                    onChange={(e) => setInvoiceTotal(e.target.value)}
                  />
                  <Input
                    placeholder="Description"
                    value={invoiceDesc}
                    onChange={(e) => setInvoiceDesc(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={loading === "create-invoice" || !invoiceTotal}
                    onClick={createInvoice}
                  >
                    Créer la facture
                  </Button>
                </div>
              ) : null}
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune facture</p>
              ) : (
                invoices.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {i.number} · {formatCurrency(i.total)}
                      </p>
                      <StatusBadge status={i.status} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        noEmail || loading === `send-i-${i.id}` || i.status === "paid"
                      }
                      onClick={() => sendInvoice(i.id)}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Projets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Projets</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowProjectForm((v) => !v)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {showProjectForm ? (
                <div className="space-y-2 rounded-md border border-dashed border-border p-2">
                  <Input
                    placeholder="Nom du projet"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={loading === "create-project" || !projectName.trim()}
                    onClick={createProject}
                  >
                    Créer le projet
                  </Button>
                </div>
              ) : null}
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun projet</p>
              ) : (
                projects.map((p) => (
                  <div
                    key={p.id}
                    className="space-y-1 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      {p.name} · {p.progress}%
                    </p>
                    <select
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                      value={p.status}
                      onChange={(e) =>
                        updateProjectStatus(p.id, e.target.value as ProjectStatus)
                      }
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Courriels */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Courriels</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEmailForm((v) => !v)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {showEmailForm ? (
                <div className="space-y-2 rounded-md border border-dashed border-border p-2">
                  <Input
                    placeholder="Objet"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                  <textarea
                    className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Votre message…"
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={
                      noEmail ||
                      loading === "send-email" ||
                      !emailSubject.trim() ||
                      !emailBody.trim()
                    }
                    onClick={sendEmail}
                  >
                    Envoyer le courriel
                  </Button>
                </div>
              ) : null}
              {emails.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun courriel</p>
              ) : (
                emails.slice(0, 5).map((e) => (
                  <p
                    key={e.id}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    {e.direction === "inbound" ? "←" : "→"} {e.subject}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
