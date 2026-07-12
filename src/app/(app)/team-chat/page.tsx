"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Send, Shield } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
  encrypted: boolean;
};

type Channel = {
  id: string;
  name: string;
  type: string;
  encrypted: boolean;
};

export default function TeamChatPage() {
  return (
    <RequirePermission permission="chat:use">
      <TeamChatInner />
    </RequirePermission>
  );
}

function TeamChatInner() {
  const [meEmail, setMeEmail] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const q = channelId ? `?channelId=${encodeURIComponent(channelId)}` : "";
    const res = await fetch(apiUrl(`/api/team-chat${q}`), { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setChannels(data.channels ?? []);
    setMessages(data.messages ?? []);
    if (data.me?.email) setMeEmail(data.me.email);
    if (!channelId && data.channelId) setChannelId(data.channelId);
  }, [channelId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(id);
  }, [load]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/team-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body, channelId }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return;
      setDraft("");
      if (data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  const channel = channels.find((c) => c.id === channelId);

  return (
    <div>
      <PageHeader
        title="Chat sécurisé"
        description="Tous les employés peuvent communiquer sur la plateforme — discussions chiffrées, sans WhatsApp personnel."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-slate-50/80 px-4 py-3 text-sm dark:bg-slate-900/40">
        <Shield className="h-4 w-4 text-brand-500" />
        <span>
          TLS en transit · chiffrement au repos · canaux entreprise et chantiers · accessible à
          chaque rôle employé.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Canaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {channels.map((ch) => (
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
                {ch.type === "company" ? (
                  <span className="text-[10px] opacity-80">Tous</span>
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
              <span className="text-xs font-normal text-muted-foreground">· chiffré</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex h-[520px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {messages.map((msg) => {
                const mine = msg.senderId === meEmail;
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
                  if (e.key === "Enter") void send();
                }}
              />
              <Button disabled={loading} onClick={() => void send()}>
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
