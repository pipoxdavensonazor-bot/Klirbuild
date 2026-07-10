"use client";

import { useState } from "react";
import { RequirePlan } from "@/components/auth/require-plan";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { aiMessages, suggestedPrompts } from "@/lib/mock-data";
import { useSessionStore } from "@/lib/workforce/session";
import type { ChatMessage } from "@/types";

export default function AiPage() {
  return (
    <RequirePlan feature="ai" title="IA Assistant — plan Growth+">
      <AiInner />
    </RequirePlan>
  );
}

function AiInner() {
  const [messages, setMessages] = useState<ChatMessage[]>(aiMessages);
  const [input, setInput] = useState("");
  const [toolPanel, setToolPanel] = useState<string | null>(null);

  async function send(prompt?: string) {
    const content = (prompt ?? input).trim();
    if (!content) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content,
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setToolPanel("analyzeBusinessContext");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          marketRegion: useSessionStore.getState().marketRegion,
        }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: data.reply ?? "I couldn't generate a reply.",
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setToolPanel(data.tool ?? null);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_err_${Date.now()}`,
          role: "assistant",
          content: "Offline mock: connect OPENAI_API_KEY to enable live responses.",
          at: new Date().toISOString(),
        },
      ]);
    }
  }

  return (
    <div>
      <PageHeader
        title="Klir AI"
        description="Business copilot with tool-calling architecture."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[520px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl bg-brand-500 px-4 py-2 text-sm text-white"
                      : "mr-auto max-w-[85%] rounded-2xl border border-border bg-background px-4 py-2 text-sm"
                  }
                >
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="Ask about invoices, clients, tasks…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
              />
              <Button onClick={() => void send()}>Send</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suggested prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedPrompts.map((prompt) => (
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
