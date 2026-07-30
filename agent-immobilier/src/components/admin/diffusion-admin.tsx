"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Account = {
  id: string;
  platform: string;
  label: string;
  enabled: boolean;
  webhookUrl: string | null;
};

type Post = {
  id: string;
  platform: string;
  status: string;
  title: string;
  url: string | null;
  createdAt: string;
  errorMessage: string | null;
};

export function DiffusionAdminClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/social");
    if (!res.ok) return;
    const data = await res.json();
    setAccounts(data.accounts || []);
    setPosts(data.posts || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(account: Account) {
    await fetch("/api/social", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, enabled: !account.enabled }),
    });
    load();
  }

  async function saveWebhook(account: Account, webhookUrl: string) {
    await fetch("/api/social", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, webhookUrl, enabled: true }),
    });
    setMessage("Webhook Zapier enregistré et activé.");
    load();
  }

  const webhook = accounts.find((a) => a.platform === "WEBHOOK");

  return (
    <div className="space-y-10">
      <section className="space-y-4 border border-[#C9A227]/40 bg-[#C9A227]/5 p-5">
        <h2 className="text-lg font-medium text-[#0F172A]">
          Publication auto via Zapier (recommandé)
        </h2>
        <p className="text-sm text-slate-600">
          Vos comptes Facebook, Instagram et LinkedIn sont déjà Connected sur{" "}
          <a
            href="https://zapier.com/app/assets/connections"
            target="_blank"
            rel="noreferrer"
            className="text-[#C9A227] underline"
          >
            zapier.com
          </a>
          . On les utilise avec un <strong>Zap webhook</strong> — sans MCP Cursor.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Créez un Zap :{" "}
            <a
              href="https://zapier.com/app/zaps"
              target="_blank"
              rel="noreferrer"
              className="text-[#C9A227] underline"
            >
              zapier.com/app/zaps
            </a>{" "}
            → <strong>Create</strong>
          </li>
          <li>
            Déclencheur : <strong>Webhooks by Zapier</strong> →{" "}
            <strong>Catch Hook</strong> → Continue → copiez l’URL du webhook
          </li>
          <li>
            Collez l’URL ci-dessous dans « Zapier / Make », puis{" "}
            <strong>Enregistrer</strong>
          </li>
          <li>
            Ajoutez 3 actions (utilisez vos comptes déjà Connected) :
            <ul className="mt-1 list-disc pl-5">
              <li>
                <strong>Facebook Pages</strong> → Create Page Post — Message ={" "}
                <code className="rounded bg-white px-1">caption</code>, Link ={" "}
                <code className="rounded bg-white px-1">url</code>
              </li>
              <li>
                <strong>Instagram for Business</strong> → Publish Photo — Caption ={" "}
                <code className="rounded bg-white px-1">caption</code>, Photo ={" "}
                <code className="rounded bg-white px-1">imageUrl</code>
              </li>
              <li>
                <strong>LinkedIn</strong> → Create Share Update — Comment ={" "}
                <code className="rounded bg-white px-1">caption</code>, URL ={" "}
                <code className="rounded bg-white px-1">url</code>
              </li>
            </ul>
          </li>
          <li>
            Publiez le Zap (ON). Ensuite, sur une maison ou un événement, cliquez{" "}
            <strong>Publier sur les réseaux connectés</strong> — le site envoie le
            webhook et Zapier poste automatiquement.
          </li>
        </ol>
        {webhook ? (
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveWebhook(webhook, String(fd.get("webhookUrl") || ""));
            }}
          >
            <div className="min-w-[280px] flex-1">
              <Label htmlFor={`wh-${webhook.id}`}>
                URL webhook Zapier (Catch Hook)
              </Label>
              <Input
                id={`wh-${webhook.id}`}
                name="webhookUrl"
                defaultValue={webhook.webhookUrl || ""}
                placeholder="https://hooks.zapier.com/hooks/catch/…"
              />
            </div>
            <Button type="submit" variant="gold" size="sm">
              Enregistrer le webhook
            </Button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">
            Canal webhook en cours de création… Rechargez la page.
          </p>
        )}
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
        <p className="text-xs text-slate-500">
          Champs envoyés par le site :{" "}
          <code>type</code>, <code>title</code>, <code>caption</code>,{" "}
          <code>message</code>, <code>url</code>, <code>imageUrl</code>,{" "}
          <code>city</code>, <code>price</code>…
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[#0F172A]">Canaux de partage manuel</h2>
        <p className="text-sm text-slate-500">
          Ouverture des fenêtres de partage natives (Facebook, LinkedIn, etc.) en
          complément du webhook.
        </p>
        {accounts
          .filter((a) => a.platform !== "WEBHOOK")
          .map((a) => (
            <div key={a.id} className="border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#0F172A]">{a.label}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {a.platform} · {a.enabled ? "Actif" : "Inactif"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggle(a)}
                >
                  {a.enabled ? "Désactiver" : "Activer"}
                </Button>
              </div>
            </div>
          ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[#0F172A]">Historique de diffusion</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune diffusion pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 bg-white">
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[#0F172A]">{p.title}</p>
                  <p className="text-slate-500">
                    {p.platform} · {p.status}
                    {p.errorMessage ? ` · ${p.errorMessage}` : ""}
                  </p>
                </div>
                {p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C9A227] hover:underline"
                  >
                    Ouvrir
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
