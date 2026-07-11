"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Mail, MailOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { EmailRecord } from "@/lib/email/email-service";

export function InboxPageClient() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [selected, setSelected] = useState<EmailRecord | null>(null);
  const [inboxAddress, setInboxAddress] = useState("");
  const [senderName, setSenderName] = useState("");
  const [hasResend, setHasResend] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/inbox");
    const data = await res.json();
    setEmails(data.emails ?? []);
    setInboxAddress(data.inboxAddress ?? "");
    setSenderName(data.senderName ?? data.companyName ?? "");
    setHasResend(Boolean(data.hasResend));
    setSelected((prev) => prev ?? data.emails?.[0] ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inbound = emails.filter((e) => e.direction === "inbound").length;
  const outbound = emails.filter((e) => e.direction === "outbound").length;

  return (
    <div>
      <PageHeader
        title="Boîte courriel"
        description="Courriels envoyés aux clients et messages reçus de l'entreprise."
        actions={
          <Button variant="outline" onClick={load}>
            <Inbox className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      {!hasResend ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          L&apos;envoi automatique n&apos;est pas encore activé sur la plateforme.
          Contactez l&apos;administrateur système pour configurer Resend.
        </div>
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
