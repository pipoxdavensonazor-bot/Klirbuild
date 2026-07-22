"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock, MessageSquareLock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

type ChatPreview = {
  id: string;
  senderName: string;
  body: string;
  at: string;
};

/** Aperçu chat sécurisé — tous les employés peuvent communiquer. */
export function TeamChatDashboardWidget() {
  const [messages, setMessages] = useState<ChatPreview[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [channelName, setChannelName] = useState("Équipe entreprise");

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/team-chat?preview=1&limit=4"), {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
      if (data.channelName) setChannelName(data.channelName);
    } catch {
      /* ignore — widget non bloquant */
    }
  }, []);

  useEffect(() => {
    void load();
    // Polling léger : 15s brûlait le CPU Worker (Error 1102)
    const id = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(id);
  }, [load]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/team-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) return;
      setDraft("");
      await load();
      void data;
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareLock className="h-5 w-5 text-accent-500" />
          Chat sécurisé
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        </CardTitle>
        <p className="text-xs text-muted-foreground">{channelName} · chiffré TLS</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 text-sm">
          {messages.length === 0 ? (
            <p className="text-muted-foreground">Aucun message — écrivez à l&apos;équipe.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id}>
                <p className="text-[10px] text-muted-foreground">
                  {m.senderName} · {formatDate(m.at)}
                </p>
                <p className="line-clamp-2">{m.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Message à l'équipe…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <Button size="icon" disabled={sending || !draft.trim()} onClick={() => void send()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <Link href="/team-chat">
          <Button variant="outline" size="sm" className="w-full">
            Ouvrir le chat complet
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
