"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { useConstructionWorkspace } from "@/components/construction/use-construction-workspace";
import { useSessionStore } from "@/lib/workforce/session";

type ChatTurn = { role: "user" | "assistant"; content: string };

export function ConstructionAiPageClient() {
  const { data, loading, reload } = useConstructionWorkspace();
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content:
        "Je suis l'IA Chantier Klir AI, connectée à OpenAI et à vos données Construction OS (chantiers, OC, leads, CCQ).",
    },
  ]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    if (data?.aiSuggestions?.length) setSuggestions(data.aiSuggestions);
  }, [data?.aiSuggestions]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const content = prompt.trim();
      if (!content || busy) return;

      const userTurn: ChatTurn = { role: "user", content };
      const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
      setMessages((prev) => [...prev, userTurn]);
      setBusy(true);

      try {
        const res = await fetch(apiUrl("/api/ai/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message: content,
            mode: "construction",
            marketRegion: useSessionStore.getState().marketRegion,
            history: history.slice(-10),
          }),
        });
        const data = await res.json();
        const reply =
          typeof data.reply === "string"
            ? data.reply
            : "Je n'ai pas pu générer de réponse.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setProvider(data.provider ?? null);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Erreur réseau. Vérifiez la connexion ou configurez OPENAI_API_KEY sur le serveur.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages]
  );

  async function saveSuggestions(next: string[]) {
    setBusy(true);
    try {
      await fetch(apiUrl("/api/construction"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "save_ai_suggestions", suggestions: next }),
      });
      setSuggestions(next);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="IA Chantier"
        description="Copilote construction Klir AI (OpenAI) — chantiers, OC, sécurité, leads."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Assistant</CardTitle>
            {provider && (
              <span className="text-xs text-muted-foreground">
                {provider === "openai" ? "OpenAI actif" : "Réponses locales"}
              </span>
            )}
          </CardHeader>
          <CardContent className="flex h-[480px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl bg-brand-500 px-4 py-2 text-sm text-white"
                      : "mr-auto max-w-[85%] rounded-2xl border border-border bg-background px-4 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {m.content}
                </div>
              ))}
              {busy && (
                <p className="text-sm text-muted-foreground">Klir AI réfléchit…</p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={input}
                placeholder="Posez une question chantier…"
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    void sendPrompt(input.trim());
                    setInput("");
                  }
                }}
              />
              <Button
                disabled={busy || !input.trim()}
                onClick={() => {
                  if (!input.trim()) return;
                  void sendPrompt(input.trim());
                  setInput("");
                }}
              >
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Suggestions</CardTitle>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                const next = [...suggestions, "Nouvelle suggestion…"];
                void saveSuggestions(next);
                setEditingIdx(next.length - 1);
                setEditText("Nouvelle suggestion…");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((s, idx) => (
              <div key={idx} className="flex gap-1">
                {editingIdx === idx ? (
                  <>
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const next = suggestions.map((x, i) =>
                          i === idx ? editText.trim() || x : x
                        );
                        void saveSuggestions(next);
                        setEditingIdx(null);
                      }}
                    >
                      OK
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void sendPrompt(s)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-brand-50/60 disabled:opacity-50 dark:hover:bg-brand-900/20"
                    >
                      {s}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingIdx(idx);
                        setEditText(s);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => void saveSuggestions(suggestions.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
