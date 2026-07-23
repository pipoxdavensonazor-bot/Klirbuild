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
    setMessage("Webhook enregistré.");
    load();
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[#0F172A]">Canaux de partage</h2>
        <p className="text-sm text-slate-500">
          Activez les réseaux. Pour Facebook / LinkedIn / X / WhatsApp, le site
          ouvre le partage natif. Pour Zapier/Make, collez un webhook.
        </p>
        {accounts.map((a) => (
          <div key={a.id} className="border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[#0F172A]">{a.label}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {a.platform} · {a.enabled ? "Actif" : "Inactif"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => toggle(a)}>
                {a.enabled ? "Désactiver" : "Activer"}
              </Button>
            </div>
            {a.platform === "WEBHOOK" ? (
              <form
                className="mt-4 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  saveWebhook(a, String(fd.get("webhookUrl") || ""));
                }}
              >
                <div className="min-w-[280px] flex-1">
                  <Label htmlFor={`wh-${a.id}`}>URL webhook Zapier / Make</Label>
                  <Input
                    id={`wh-${a.id}`}
                    name="webhookUrl"
                    defaultValue={a.webhookUrl || ""}
                    placeholder="https://hooks.zapier.com/…"
                  />
                </div>
                <Button type="submit" variant="gold" size="sm">
                  Enregistrer
                </Button>
              </form>
            ) : null}
          </div>
        ))}
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[#0F172A]">Historique de diffusion</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune diffusion pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 bg-white">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
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
