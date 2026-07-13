"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Inbox, Mail, MailOpen, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { EmailRecord } from "@/lib/email/email-service";
import type { Client } from "@/types";

export function InboxPageClient() {
  const searchParams = useSearchParams();
  const filterClientId = searchParams.get("clientId") ?? "";

  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [selected, setSelected] = useState<EmailRecord | null>(null);
  const [inboxAddress, setInboxAddress] = useState("");
  const [senderName, setSenderName] = useState("");
  const [hasResend, setHasResend] = useState(false);
  const [hasResendInbound, setHasResendInbound] = useState(false);
  const [inboundWebhookUrl, setInboundWebhookUrl] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [composeClientId, setComposeClientId] = useState(filterClientId);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const q = filterClientId ? `?clientId=${encodeURIComponent(filterClientId)}` : "";
    const res = await fetch(apiUrl(`/api/inbox${q}`), { credentials: "include" });
    const data = await res.json();
    setEmails(data.emails ?? []);
    setInboxAddress(data.inboxAddress ?? "");
    setSenderName(data.senderName ?? data.companyName ?? "");
    setHasResend(Boolean(data.hasResend));
    setHasResendInbound(Boolean(data.hasResendInbound));
    setInboundWebhookUrl(data.inboundWebhookUrl ?? "");
    setSelected((prev) => prev ?? data.emails?.[0] ?? null);
  }, [filterClientId]);

  useEffect(() => {
    load();
    fetch(apiUrl("/api/clients"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setClients([]));
  }, [load]);

  useEffect(() => {
    if (filterClientId) setComposeClientId(filterClientId);
  }, [filterClientId]);

  async function sendCompose() {
    const res = await fetch(apiUrl("/api/inbox"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        clientId: composeClientId,
        subject: composeSubject,
        body: composeBody,
      }),
    });
    const data = await parseApiResponse(res);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Envoi échoué");
      return;
    }
    setComposeOpen(false);
    setComposeSubject("");
    setComposeBody("");
    setMessage(`Courriel envoyé à ${data.to}`);
    await load();
  }

  const inbound = emails.filter((e) => e.direction === "inbound").length;
  const outbound = emails.filter((e) => e.direction === "outbound").length;

  return (
    <div>
      <PageHeader
        title="Boîte courriel"
        description="Recevez et envoyez des courriels au nom de votre entreprise."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setComposeOpen((v) => !v)}>
              <Send className="h-4 w-4" />
              Nouveau message
            </Button>
            <Button variant="outline" onClick={load}>
              <Inbox className="h-4 w-4" />
              Actualiser
            </Button>
          </div>
        }
      />

      {!hasResend ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          L&apos;envoi automatique n&apos;est pas encore activé sur la plateforme.
          Contactez l&apos;administrateur système pour configurer Resend.
        </div>
      ) : hasResendInbound && inboundWebhookUrl ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p className="font-medium">Réception entrante active (Resend)</p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-emerald-100/80">
            Webhook <code className="rounded bg-muted px-1">email.received</code> →{" "}
            <code className="break-all rounded bg-muted px-1">{inboundWebhookUrl}</code>
          </p>
          {inboxAddress ? (
            <p className="mt-1 text-xs text-muted-foreground dark:text-emerald-100/80">
              Adresse boîte entreprise :{" "}
              <code className="rounded bg-muted px-1">{inboxAddress}</code>
            </p>
          ) : null}
        </div>
      ) : inboundWebhookUrl ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Réception entrante (Resend)</p>
          <p className="mt-1 text-xs">
            Webhook <code className="rounded bg-muted px-1">email.received</code> →{" "}
            <code className="break-all rounded bg-muted px-1">{inboundWebhookUrl}</code>
          </p>
          <p className="mt-1 text-xs">
            Configurez <code className="rounded bg-muted px-1">RESEND_WEBHOOK_SECRET</code> sur
            Netlify et routez le domaine de réception vers l&apos;adresse boîte entreprise
            ci-dessous.
          </p>
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {composeOpen ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Nouveau courriel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={composeClientId}
              onChange={(e) => setComposeClientId(e.target.value)}
            >
              <option value="">Choisir un client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
            <Input
              placeholder="Objet"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
            />
            <textarea
              className="min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Votre message…"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
            />
            <Button
              disabled={!composeClientId || !composeSubject.trim() || !composeBody.trim()}
              onClick={() => void sendCompose()}
            >
              Envoyer
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 rounded-lg border border-border bg-slate-50/70 px-4 py-3 text-sm dark:bg-slate-900/40">
        <p>
          <strong>Boîte entreprise :</strong> {inboxAddress || "—"}
        </p>
        <p className="mt-1 text-muted-foreground">
          Courriels envoyés au nom de <strong>{senderName || "votre entreprise"}</strong>
          {" · "}{inbound} reçus · {outbound} envoyés
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun courriel</p>
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelected(email)}
                  className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                    selected?.id === email.id
                      ? "border-brand-400 bg-brand-50/60 dark:bg-brand-900/20"
                      : "border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium line-clamp-1">{email.subject}</span>
                    {email.direction === "inbound" ? (
                      <Mail className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                    ) : (
                      <MailOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                    {email.direction === "inbound" ? email.fromEmail : email.toEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(email.createdAt)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm">
              {selected ? selected.subject : "Sélectionnez un message"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">De</p>
                    <p>{selected.fromEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">À</p>
                    <p>{selected.toEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Direction</p>
                    <p>{selected.direction === "inbound" ? "Reçu" : "Envoyé"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p>{formatDate(selected.createdAt)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-slate-50/70 p-4 dark:bg-slate-900/40">
                  {selected.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: selected.bodyHtml }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">
                      {selected.bodyText || "(aucun contenu)"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Les soumissions et factures envoyées apparaissent ici.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
