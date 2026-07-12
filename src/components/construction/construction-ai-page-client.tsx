"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/lib/api-client";
import { useConstructionWorkspace } from "@/components/construction/use-construction-workspace";
import { formatCurrency } from "@/lib/utils";

export function ConstructionAiPageClient() {
  const { data, loading, reload } = useConstructionWorkspace();
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Je suis l'IA Construction OS. Je résume vos chantiers réels, signale les risques et aide aux OC, sécurité et leads.",
    },
  ]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.aiSuggestions?.length) setSuggestions(data.aiSuggestions);
  }, [data?.aiSuggestions]);

  const replyTo = useCallback(
    (prompt: string) => {
      const lower = prompt.toLowerCase();
      const jobs = data?.jobs ?? [];
      const orders = data?.changeOrders ?? [];
      const leads = data?.leads ?? [];
      let reply = "Synthèse Construction OS basée sur vos données enregistrées.";

      if (lower.includes("résumé") || lower.includes("quotidien")) {
        const active = jobs.filter((j) => j.status === "in_progress");
        reply = active.length
          ? `Résumé : ${active.length} chantier(s) actif(s). ${active
              .map(
                (j) =>
                  `${j.name} ${j.progressPct}% (${formatCurrency(j.actualCost)} / ${formatCurrency(j.budgetCost)})`
              )
              .join(" · ")}.`
          : "Aucun chantier en cours pour le moment.";
      } else if (lower.includes("budget") || lower.includes("risque") || lower.includes("dépassement")) {
        const risky = jobs.filter(
          (j) => j.budgetCost > 0 && j.actualCost / j.budgetCost > 0.7 && j.progressPct < 90
        );
        reply = risky.length
          ? `Risque marge : ${risky
              .map(
                (j) =>
                  `${j.number} — ${Math.round((j.actualCost / j.budgetCost) * 100)}% budget à ${j.progressPct}%`
              )
              .join("; ")}.`
          : "Aucun chantier critique sur le burn rate actuel.";
      } else if (lower.includes("ordre") || lower.includes("changement") || lower.includes("oc")) {
        const pending = orders.filter((c) => ["draft", "submitted"].includes(c.status));
        reply = pending.length
          ? `OC ouverts : ${pending.map((c) => `${c.number} ${c.title} (${formatCurrency(c.amount)})`).join("; ")}.`
          : "Aucun OC en attente — vous pouvez en créer dans Ordres de changement.";
      } else if (lower.includes("toolbox") || lower.includes("sécurité")) {
        reply =
          "Toolbox talk — hauteur : harnais, ancrage, barricades, météo, secouriste, permis signé. Enregistrez sur le chat sécurisé du chantier.";
      } else if (lower.includes("lead") || lower.includes("commerciale")) {
        const hot = leads.filter((l) => ["estimate", "negotiation"].includes(l.stage));
        reply = hot.length
          ? `Leads chauds : ${hot.map((l) => `${l.name} (${formatCurrency(l.valueEstimate)})`).join("; ")}.`
          : "Pipeline vide — ajoutez des leads dans CRM Construction.";
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content: prompt },
        { role: "assistant", content: reply },
      ]);
    },
    [data]
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

  function sendPrompt(prompt: string) {
    replyTo(prompt);
  }

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="IA Chantier"
        description="Copilote construction branché sur vos chantiers, OC et leads — suggestions modifiables."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Assistant</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[480px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl bg-brand-500 px-4 py-2 text-sm text-white"
                      : "mr-auto max-w-[85%] rounded-2xl border border-border bg-background px-4 py-2 text-sm"
                  }
                >
                  {m.content}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={input}
                placeholder="Posez une question chantier…"
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    sendPrompt(input.trim());
                    setInput("");
                  }
                }}
              />
              <Button
                disabled={busy || !input.trim()}
                onClick={() => {
                  if (!input.trim()) return;
                  sendPrompt(input.trim());
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
                      onClick={() => sendPrompt(s)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-brand-50/60 dark:hover:bg-brand-900/20"
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
