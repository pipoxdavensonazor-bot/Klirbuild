"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { constructionJobs, changeOrders } from "@/modules/construction-os/mock-data";
import { formatCurrency } from "@/lib/utils";

const suggestions = [
  "Résumé quotidien des chantiers actifs",
  "Quels chantiers risquent un dépassement de budget ?",
  "Brouillon d'ordre de changement pour renforcement dalle",
  "Checklist toolbox talk — travaux en hauteur",
  "Réponse commerciale pour lead agrandissement",
];

export default function ConstructionAiPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Je suis l'IA Construction OS. Je peux résumer les chantiers, signaler les risques de marge, préparer des OC et aider aux estimés / leads.",
    },
  ]);
  const [input, setInput] = useState("");

  function replyTo(prompt: string) {
    const lower = prompt.toLowerCase();
    let reply =
      "Voici une synthèse Construction OS basée sur les données démo du compte.";

    if (lower.includes("résumé") || lower.includes("quotidien")) {
      const active = constructionJobs.filter((j) => j.status === "in_progress");
      reply = `Résumé chantier : ${active.length} actifs. ${active
        .map(
          (j) =>
            `${j.name} ${j.progressPct}% (coûts ${formatCurrency(j.actualCost)} / budget ${formatCurrency(j.budgetCost)})`
        )
        .join(" · ")}. ${changeOrders.filter((c) => c.status === "submitted").length} OC en attente d'approbation.`;
    } else if (lower.includes("dépassement") || lower.includes("budget") || lower.includes("risque")) {
      const risky = constructionJobs.filter(
        (j) =>
          j.budgetCost > 0 &&
          j.actualCost / j.budgetCost > 0.7 &&
          j.progressPct < 90
      );
      reply = risky.length
        ? `Risque marge : ${risky
            .map(
              (j) =>
                `${j.number} — ${Math.round((j.actualCost / j.budgetCost) * 100)}% budget à ${j.progressPct}% avancement`
            )
            .join("; ")}.`
        : "Aucun chantier critique détecté sur le burn rate actuel.";
    } else if (lower.includes("ordre") || lower.includes("changement") || lower.includes("oc")) {
      reply =
        "Brouillon OC : « Renforcement structure dalle — conditions de sol imprévues ». Montant estimé 18 500 $ + TPS/TVQ. Travaux : ingénierie, ferraillage, béton. Impact délai : +5 jours. Prêt à soumettre au client Nordic Facilities.";
    } else if (lower.includes("toolbox") || lower.includes("sécurité") || lower.includes("checklist")) {
      reply =
        "Toolbox talk — travaux en hauteur : 1) Harnais inspectés 2) Points d'ancrage validés 3) Zone barricadée 4) Météo / vent 5) Secouriste désigné 6) Permis de travail signé. Faire signer l'équipe sur le chat sécurisé du chantier.";
    } else if (lower.includes("lead") || lower.includes("commerciale") || lower.includes("réponse")) {
      reply =
        "Brouillon email : Bonjour, merci pour votre demande d'agrandissement à Sainte-Thérèse. Nous pouvons planifier une visite technique cette semaine et vous remettre un estimé détaillé sous 5 jours ouvrables, taxes TPS/TVQ incluses. Souhaitez-vous un créneau mardi ou jeudi ?";
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", content: prompt },
      { role: "assistant", content: reply },
    ]);
  }

  return (
    <div>
      <PageHeader
        title="IA Chantier"
        description="Copilote construction : résumés, risques, OC, sécurité et réponses leads."
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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    replyTo(input.trim());
                    setInput("");
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (!input.trim()) return;
                  replyTo(input.trim());
                  setInput("");
                }}
              >
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => replyTo(s)}
                className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-brand-50/60 dark:hover:bg-brand-900/20"
              >
                {s}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
