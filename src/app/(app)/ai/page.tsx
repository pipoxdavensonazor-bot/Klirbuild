"use client";

import { useEffect, useState } from "react";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/lib/workforce/session";
import { apiUrl } from "@/lib/api-client";
import type { ChatMessage } from "@/types";

const STARTER_PROMPTS = [
  "Résume mes factures en retard",
  "Quels clients sont actifs ce mois-ci ?",
  "Prochaines échéances de paie",
];

export default function AiPage() {
  return (
    <RequirePlan feature="ai" title="IA Assistant — plan Growth+">
      <AiInner />
    </RequirePlan>
  );
}

function AiInner() {
  const userName = useSessionStore((s) => s.userName);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [toolPanel, setToolPanel] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch(apiUrl("/api/ai/chat"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const loaded = (d.messages as ChatMessage[] | undefined) ?? [];
        if (loaded.length) setMessages(loaded);
      })
      .catch(() => undefined);
  }, []);

  async function send(prompt?: string) {
    const content = (prompt ?? input).trim();
    if (!content || busy) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content,
      at: new Date().toISOString(),
    };
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setToolPanel("analyzeBusinessContext");
    setBusy(true);

    try {
      const res = await fetch(apiUrl("/api/ai/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: content,
          mode: "general",
          marketRegion: useSessionStore.getState().marketRegion,
          history: history.slice(-10),
        }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "Je n'ai pas pu générer de réponse.",
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setToolPanel(data.tool ?? null);
      setProvider(data.provider ?? null);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          role: "assistant",
          content:
            "Erreur réseau. Configurez OPENAI_API_KEY sur Vercel pour activer Klir AI en direct.",
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Klir AI"
        description="Copilote métier connecté à OpenAI — factures, clients, tâches, construction."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Chat</CardTitle>
            {provider && (
              <span className="text-xs text-muted-foreground">
                {provider === "openai" ? "OpenAI actif" : "Mode démo local"}
              </span>
            )}
          </CardHeader>
          <CardContent className="flex h-[520px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl bg-brand-500 px-4 py-2 text-sm text-white"
                      : "mr-auto max-w-[85%] rounded-2xl border border-border bg-background px-4 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Factures, clients, tâches, chantiers…"
                value={input}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
              />
              <Button disabled={busy || !input.trim()} onClick={() => void send()}>
                {busy ? "…" : "Envoyer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suggested prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void send(prompt)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-brand-50/60 dark:hover:bg-brand-900/20"
                >
                  {prompt}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tool execution</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {toolPanel ? (
                <div className="space-y-2">
                  <p>
                    Tool: <code className="text-foreground">{toolPanel}</code>
                  </p>
                  <p>Args validated · confirm-before-write for mutations.</p>
                  <p className="rounded-md border border-dashed border-border p-3">
                    Function-calling registry ready:
                    summarizeOverdueInvoices, draftClientEmail, createTask,
                    weeklyBusinessSummary.
                  </p>
                </div>
              ) : (
                <p>No tool running. Send a prompt to preview the tool panel.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
