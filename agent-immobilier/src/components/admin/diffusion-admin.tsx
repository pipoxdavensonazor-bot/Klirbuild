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
  hasDirectApi?: boolean;
  metaPreview?: {
    pageId?: string | null;
    igUserId?: string | null;
    authorUrn?: string | null;
    hasToken?: boolean;
  } | null;
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

const DIRECT_PLATFORMS = ["FACEBOOK", "INSTAGRAM", "LINKEDIN"] as const;

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

  async function saveWebhook(account: Account, webhookUrl: string, label: string) {
    await fetch("/api/social", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, webhookUrl, enabled: true }),
    });
    setMessage(`${label} enregistré et activé.`);
    load();
  }

  async function saveDirectMeta(
    account: Account,
    fields: Record<string, string>
  ) {
    const accessToken = fields.accessToken?.trim();
    if (!accessToken && !account.hasDirectApi) {
      setMessage("Collez le jeton d’accès (access token).");
      return;
    }
    const meta: Record<string, string> = {};
    if (account.platform === "FACEBOOK" && fields.pageId) {
      meta.pageId = fields.pageId.trim();
    }
    if (account.platform === "INSTAGRAM" && fields.igUserId) {
      meta.igUserId = fields.igUserId.trim();
    }
    if (account.platform === "LINKEDIN" && fields.authorUrn) {
      meta.authorUrn = fields.authorUrn.trim();
    }
    if (accessToken) meta.accessToken = accessToken;
    else if (account.hasDirectApi) {
      // Garder le token existant côté serveur : on envoie seulement les IDs
      // en réutilisant un PUT partiel — l’API remplace tout metaJson,
      // donc on exige le token à chaque sauvegarde.
      setMessage(
        "Pour modifier les IDs, recollez aussi le jeton d’accès (il n’est pas réaffiché)."
      );
      return;
    }

    await fetch("/api/social", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: account.id,
        metaJson: JSON.stringify(meta),
        enabled: true,
      }),
    });
    setMessage(`API ${account.label} enregistrée — publication directe activée.`);
    load();
  }

  async function clearDirectMeta(account: Account) {
    await fetch("/api/social", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id, metaJson: "" }),
    });
    setMessage(`API ${account.label} déconnectée.`);
    load();
  }

  const zapier = accounts.find((a) => a.platform === "WEBHOOK");
  const make = accounts.find((a) => a.platform === "WEBHOOK_MAKE");
  const directAccounts = accounts.filter((a) =>
    DIRECT_PLATFORMS.includes(a.platform as (typeof DIRECT_PLATFORMS)[number])
  );

  return (
    <div className="space-y-10">
      <section className="space-y-4 border border-[#C9A227] bg-[#C9A227]/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
          Chemin choisi — court · sûr · rapide
        </p>
        <h2 className="text-lg font-medium text-[#0F172A]">
          Zapier webhook (Catch Hook)
        </h2>
        <p className="text-sm text-slate-600">
          On utilise vos comptes déjà Connected sur zapier.com. Aucun jeton Meta
          dans le site. Une fois l’URL collée, « Publier sur les réseaux » envoie
          Facebook + Instagram + LinkedIn automatiquement.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Ouvrez{" "}
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
            <strong>Catch Hook</strong> → Continue → <strong>copiez l’URL</strong>
          </li>
          <li>Collez l’URL ci-dessous → Enregistrer</li>
          <li>
            3 actions (comptes Connected Léonne) :
            <ul className="mt-1 list-disc pl-5">
              <li>
                Facebook Pages → Create Page Post — Message{" "}
                <code>caption</code>, Link <code>url</code>
              </li>
              <li>
                Instagram for Business → Publish Photo — Caption{" "}
                <code>caption</code>, Photo <code>imageUrl</code>
              </li>
              <li>
                LinkedIn → Create Share Update — Comment{" "}
                <code>caption</code>, URL <code>url</code>
              </li>
            </ul>
          </li>
          <li>
            Zap <strong>ON</strong>. Test : condo Louis-Jolliet → Publier sur les
            réseaux.
          </li>
        </ol>
        {zapier ? (
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveWebhook(zapier, String(fd.get("webhookUrl") || ""), "Webhook Zapier");
            }}
          >
            <div className="min-w-[280px] flex-1">
              <Label htmlFor={`wh-${zapier.id}`}>URL Catch Hook Zapier</Label>
              <Input
                id={`wh-${zapier.id}`}
                name="webhookUrl"
                defaultValue={zapier.webhookUrl || ""}
                placeholder="https://hooks.zapier.com/hooks/catch/…"
              />
            </div>
            <Button type="submit" variant="gold" size="sm">
              Enregistrer Zapier
            </Button>
          </form>
        ) : null}
      </section>

      <details className="space-y-4 border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-lg font-medium text-[#0F172A]">
          Autres options (Make.com / API directe) — non nécessaires
        </summary>
      <section className="mt-4 space-y-4 border border-slate-300 bg-slate-50 p-5">
        <h2 className="text-lg font-medium text-[#0F172A]">
          Make.com (webhook)
        </h2>
        <p className="text-sm text-slate-600">
          Même principe : le site envoie un JSON, Make publie sur Facebook,
          Instagram et LinkedIn avec les comptes que vous connectez dans Make.
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Sur{" "}
            <a
              href="https://www.make.com/"
              target="_blank"
              rel="noreferrer"
              className="text-[#C9A227] underline"
            >
              make.com
            </a>
            , créez un scénario → module{" "}
            <strong>Webhooks → Custom webhook</strong> → copiez l’URL
          </li>
          <li>Collez l’URL ci-dessous → Enregistrer</li>
          <li>
            Ajoutez ensuite : Facebook Pages (Create a Post), Instagram for
            Business (Create a Media Post), LinkedIn (Create a Company Update).
            Mappez <code>caption</code>, <code>url</code>, <code>imageUrl</code>
          </li>
          <li>Activez le scénario</li>
        </ol>
        {make ? (
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              saveWebhook(make, String(fd.get("webhookUrl") || ""), "Webhook Make");
            }}
          >
            <div className="min-w-[280px] flex-1">
              <Label htmlFor={`mk-${make.id}`}>URL webhook Make.com</Label>
              <Input
                id={`mk-${make.id}`}
                name="webhookUrl"
                defaultValue={make.webhookUrl || ""}
                placeholder="https://hook.make.com/…"
              />
            </div>
            <Button type="submit" variant="gold" size="sm">
              Enregistrer Make
            </Button>
          </form>
        ) : (
          <p className="text-sm text-slate-500">
            Canal Make en cours de création… Rechargez la page.
          </p>
        )}
      </section>

      <section className="mt-4 space-y-4 border border-emerald-700/30 bg-emerald-50/40 p-5">
        <h2 className="text-lg font-medium text-[#0F172A]">
          API directe Meta + LinkedIn
        </h2>
        <p className="text-sm text-slate-600">
          Collez un jeton de page / LinkedIn : le site publie lui-même quand vous
          cliquez « Publier sur les réseaux connectés ».
        </p>
        <details className="text-sm text-slate-700">
          <summary className="cursor-pointer font-medium text-[#0F172A]">
            Où trouver les jetons ?
          </summary>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Facebook + Instagram</strong> :{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="text-[#C9A227] underline"
              >
                Graph API Explorer
              </a>{" "}
              → permissions <code>pages_manage_posts</code>,{" "}
              <code>pages_read_engagement</code>,{" "}
              <code>instagram_basic</code>,{" "}
              <code>instagram_content_publish</code> → générer un{" "}
              <em>Page Access Token</em>. ID page = Page ID. ID Instagram ={" "}
              Instagram Business Account ID lié à la page.
            </li>
            <li>
              <strong>LinkedIn</strong> : app développeur LinkedIn avec{" "}
              <code>w_organization_social</code> (page entreprise) → jeton OAuth.
              <code>authorUrn</code> ={" "}
              <code>urn:li:organization:VOTRE_ID</code> ou{" "}
              <code>urn:li:person:VOTRE_ID</code>.
            </li>
          </ul>
        </details>

        <div className="space-y-4">
          {directAccounts.map((a) => (
            <div
              key={a.id}
              className="border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-[#0F172A]">{a.label}</p>
                  <p className="text-xs text-slate-500">
                    {a.hasDirectApi
                      ? "API connectée — publication automatique"
                      : "Pas encore configuré — partage manuel seulement"}
                  </p>
                </div>
                {a.hasDirectApi ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => clearDirectMeta(a)}
                  >
                    Déconnecter l’API
                  </Button>
                ) : null}
              </div>
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  saveDirectMeta(a, {
                    pageId: String(fd.get("pageId") || ""),
                    igUserId: String(fd.get("igUserId") || ""),
                    authorUrn: String(fd.get("authorUrn") || ""),
                    accessToken: String(fd.get("accessToken") || ""),
                  });
                }}
              >
                {a.platform === "FACEBOOK" ? (
                  <div>
                    <Label htmlFor={`page-${a.id}`}>Page ID Facebook</Label>
                    <Input
                      id={`page-${a.id}`}
                      name="pageId"
                      defaultValue={a.metaPreview?.pageId || ""}
                      placeholder="ex. 1234567890"
                      required
                    />
                  </div>
                ) : null}
                {a.platform === "INSTAGRAM" ? (
                  <div>
                    <Label htmlFor={`ig-${a.id}`}>
                      Instagram Business Account ID
                    </Label>
                    <Input
                      id={`ig-${a.id}`}
                      name="igUserId"
                      defaultValue={a.metaPreview?.igUserId || ""}
                      placeholder="ex. 17841400…"
                      required
                    />
                  </div>
                ) : null}
                {a.platform === "LINKEDIN" ? (
                  <div>
                    <Label htmlFor={`urn-${a.id}`}>authorUrn LinkedIn</Label>
                    <Input
                      id={`urn-${a.id}`}
                      name="authorUrn"
                      defaultValue={a.metaPreview?.authorUrn || ""}
                      placeholder="urn:li:organization:…"
                      required
                    />
                  </div>
                ) : null}
                <div className="md:col-span-2">
                  <Label htmlFor={`tok-${a.id}`}>Jeton d’accès (access token)</Label>
                  <Input
                    id={`tok-${a.id}`}
                    name="accessToken"
                    type="password"
                    autoComplete="off"
                    placeholder={
                      a.hasDirectApi
                        ? "•••• déjà enregistré — recollez pour remplacer"
                        : "Collez le jeton ici"
                    }
                  />
                </div>
                <div>
                  <Button type="submit" variant="gold" size="sm">
                    Enregistrer {a.label}
                  </Button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </section>
      </details>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[#0F172A]">
          Canaux de partage manuel
        </h2>
        <p className="text-sm text-slate-500">
          Ouverture des fenêtres natives si aucune API / webhook n’est configuré
          pour ce réseau.
        </p>
        {accounts
          .filter((a) => !a.platform.startsWith("WEBHOOK"))
          .map((a) => (
            <div key={a.id} className="border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#0F172A]">{a.label}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {a.platform} · {a.enabled ? "Actif" : "Inactif"}
                    {a.hasDirectApi ? " · API" : ""}
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
        <h2 className="text-lg font-medium text-[#0F172A]">
          Historique de diffusion
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucune diffusion pour le moment.
          </p>
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
