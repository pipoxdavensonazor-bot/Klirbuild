"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clipboard, ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoEmbed } from "@/components/help/video-embed";
import type { Tutorial } from "@/lib/help/tutorials";
import { useSessionStore } from "@/lib/workforce/session";

export function LoomRecorderStudio({
  publicAppId,
  tutorialOptions,
}: {
  publicAppId?: string;
  tutorialOptions: Pick<Tutorial, "order" | "title">[];
}) {
  const role = useSessionStore((state) => state.role);
  const [videoUrl, setVideoUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [tutorialNumber, setTutorialNumber] = useState(1);
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";

  if (!isAdmin) return null;

  const envName = `NEXT_PUBLIC_HELP_VIDEO_${tutorialNumber}`;
  const selected = tutorialOptions.find((t) => t.order === tutorialNumber);

  async function copyVideoUrl() {
    if (!videoUrl.trim()) return;
    await navigator.clipboard.writeText(videoUrl.trim());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Card className="border-brand-200/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-4 w-4 text-brand-600" />
          Studio Loom — administrateurs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enregistrez l&apos;écran dans Loom, puis collez le lien de partage ici pour prévisualiser
          le tutoriel et le publier sur Netlify.
        </p>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium">
            Tutoriel à enregistrer
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={tutorialNumber}
              onChange={(event) => {
                setTutorialNumber(Number(event.target.value));
                setVideoUrl("");
              }}
            >
              {tutorialOptions.map((tutorial) => (
                <option key={tutorial.order} value={tutorial.order}>
                  {tutorial.order}. {tutorial.title}
                </option>
              ))}
            </select>
          </label>

          <a
            href="https://www.loom.com/record"
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button type="button" className="gap-2">
              <Video className="h-4 w-4" />
              Ouvrir Loom
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>

        {publicAppId ? (
          <p className="text-xs text-muted-foreground">
            App Loom configurée ({publicAppId.slice(0, 8)}…). Domaines autorisés :
            klirline.app
          </p>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Optionnel : définissez <code>NEXT_PUBLIC_LOOM_PUBLIC_APP_ID</code> sur Netlify pour
            lier votre app Loom SDK.
          </p>
        )}

        <label className="grid gap-1.5 text-sm font-medium">
          Collez l&apos;URL Loom / YouTube
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.loom.com/share/..."
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>

        {videoUrl.trim() ? (
          <div className="space-y-3">
            <VideoEmbed
              url={videoUrl.trim()}
              title={selected?.title ?? "Aperçu tutoriel"}
            />
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
              <p>
                Pour publier : sur Netlify, définissez{" "}
                <code className="font-medium">{envName}</code> avec cette URL, puis redéployez.
              </p>
              <div className="mt-2 flex min-w-0 gap-2">
                <input
                  readOnly
                  value={videoUrl.trim()}
                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={copyVideoUrl}>
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copied ? "Copié" : "Copier"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Link
          href="/help/bienvenue-navigation"
          className="inline-flex text-sm text-brand-700 hover:underline dark:text-brand-300"
        >
          Voir le premier script avant d&apos;enregistrer
        </Link>
      </CardContent>
    </Card>
  );
}
