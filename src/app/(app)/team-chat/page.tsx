"use client";

import { useMemo, useState } from "react";
import { Lock, Send, Shield } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  chatChannels,
  chatMessages as initialMessages,
  employees,
} from "@/lib/workforce/mock-data";
import { useSessionStore } from "@/lib/workforce/session";
import type { TeamChatMessage } from "@/lib/workforce/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function TeamChatPage() {
  return (
    <RequirePermission permission="chat:use">
      <TeamChatInner />
    </RequirePermission>
  );
}

function TeamChatInner() {
  const employeeId = useSessionStore((s) => s.employeeId);
  const me = employees.find((e) => e.id === employeeId) ?? employees[2];

  const myChannels = useMemo(
    () => chatChannels.filter((c) => c.memberIds.includes(me.id) || c.type === "company"),
    [me.id]
  );

  const [channelId, setChannelId] = useState(myChannels[0]?.id ?? "ch_company");
  const [messages, setMessages] = useState<TeamChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");

  const channelMessages = messages.filter((m) => m.channelId === channelId);
  const channel = chatChannels.find((c) => c.id === channelId);

  function send() {
    const body = draft.trim();
    if (!body) return;
    const msg: TeamChatMessage = {
      id: `cm_${Date.now()}`,
      channelId,
      senderId: me.id,
      senderName: me.name,
      body,
      at: new Date().toISOString(),
      encrypted: true,
    };
    setMessages((prev) => [...prev, msg]);
    setDraft("");
  }

  return (
    <div>
      <PageHeader
        title="Chat sécurisé"
        description="Messagerie interne chiffrée pour les équipes chantier — plus sûr que SMS / WhatsApp perso."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-slate-50/80 px-4 py-3 text-sm dark:bg-slate-900/40">
        <Shield className="h-4 w-4 text-brand-500" />
        <span>
          TLS en transit · chiffrement au repos · canaux par chantier · pas de transfert hors
          entreprise (MVP — E2E prêt à brancher).
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Canaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {myChannels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setChannelId(ch.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                  channelId === ch.id
                    ? "bg-brand-500 text-white"
                    : "hover:bg-slate-100 dark:hover:bg-slate-900"
                )}
              >
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 opacity-70" />
                  {ch.name}
                </span>
                {ch.unread > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      channelId === ch.id ? "bg-white/20" : "bg-accent-500 text-brand-900"
                    )}
                  >
                    {ch.unread}
                  </span>
                ) : null}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-accent-500" />
              {channel?.name ?? "Canal"}
              <span className="text-xs font-normal text-muted-foreground">
                · chiffré
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-[520px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {channelMessages.map((msg) => {
                const mine = msg.senderId === me.id;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                  >
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      {msg.senderName} · {formatDate(msg.at)}
                      {msg.encrypted ? " · 🔒" : ""}
                    </p>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        mine
                          ? "bg-brand-500 text-white"
                          : "border border-border bg-background"
                      )}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Message sécurisé à l'équipe…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
              <Button onClick={send}>
                <Send className="h-4 w-4" />
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
