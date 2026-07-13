"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, ExternalLink, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoEmbed } from "@/components/help/video-embed";
import type { Tutorial } from "@/lib/help/tutorials";
import { useSessionStore } from "@/lib/workforce/session";

type RecorderStatus = "idle" | "loading" | "ready" | "unsupported" | "error";

export function LoomRecorderStudio({
  publicAppId,
  tutorialOptions,
}: {
  publicAppId?: string;
  tutorialOptions: Pick<Tutorial, "order" | "title">[];
}) {
  const reactId = useId();
  const buttonId = `loom-record-${reactId.replaceAll(":", "")}`;
  const role = useSessionStore((state) => state.role);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [tutorialNumber, setTutorialNumber] = useState(1);
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";

  useEffect(() => {
    if (!isAdmin || !publicAppId) return;

    const loomAppId = publicAppId;
    let disposed = false;
    let teardown: (() => void) | undefined;

    async function initializeLoom() {
      setStatus("loading");

      try {
        const [{ createInstance }, { isSupported }] = await Promise.all([
          import("@loomhq/record-sdk"),
          import("@loomhq/record-sdk/is-supported"),
        ]);
        const support = await isSupported();

        if (!support.supported) {
          if (!disposed) {
            setStatus("unsupported");
            setMessage(
              support.error === "third-party-cookies-disabled"
                ? "Loom nécessite les témoins tiers dans ce navigateur."
                : "L'enregistrement Loom n'est pas compatible avec ce navigateur."
            );
          }
          return;
        }

        const element = document.getElementById(buttonId);
        if (!element || disposed) return;

        const sdk = await createInstance({
          mode: "standard",
          publicAppId: loomAppId,
          config: { insertButtonText: "Utiliser cette vidéo" },
        });
        teardown = sdk.teardown;
        const recorder = sdk.configureButton({ element });

        recorder.on("recording-start", () => {
          setMessage("Enregistrement en cours…");
          setVideoUrl("");
        });
        recorder.on("insert-click", (video) => {
          setVideoUrl(video.sharedUrl);
          setMessage("Vidéo terminée. Copiez son URL pour la publier dans ce tutoriel.");
        });
        recorder.on("cancel", () => setMessage(""));

        if (!disposed) setStatus("ready");
      } catch (error) {
        console.error("Loom SDK initialization failed", error);
        if (!disposed) {
          setStatus("error");
          setMessage(
            "Loom n'a pas pu démarrer. Vérifiez l'identifiant public et le domaine autorisé."
          );
        }
      }
    }

    void initializeLoom();

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [buttonId, isAdmin, publicAppId]);

  if (!isAdmin) return null;

  const envName = `NEXT_PUBLIC_HELP_VIDEO_${tutorialNumber}`;

  async function copyVideoUrl() {
    if (!videoUrl) return;
    await navigator.clipboard.writeText(videoUrl);
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
        {!publicAppId ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-medium">Configuration Loom requise</p>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>Créez une application SDK Standard dans le portail Loom.</li>
              <li>
                Autorisez les domaines <code>klirline.app</code> et{" "}
                <code>localhost</code> pour le bac à sable.
              </li>
              <li>
                Ajoutez son identifiant dans Netlify sous{" "}
                <code>NEXT_PUBLIC_LOOM_PUBLIC_APP_ID</code>.
              </li>
            </ol>
            <a
              href="https://dev.loom.com/docs/record-sdk/account-management"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 font-medium underline"
            >
              Ouvrir les instructions Loom
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-1.5 text-sm font-medium">
                Tutoriel à enregistrer
                <select
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                  value={tutorialNumber}
                  onChange={(event) => {
                    setTutorialNumber(Number(event.target.value));
                    setVideoUrl("");
                    setMessage("");
                  }}
                >
                  {tutorialOptions.map((tutorial) => (
                    <option key={tutorial.order} value={tutorial.order}>
                      {tutorial.order}. {tutorial.title}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                id={buttonId}
                type="button"
                disabled={status !== "ready"}
                className="gap-2"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                {status === "loading" ? "Chargement Loom…" : "Enregistrer avec Loom"}
              </Button>
            </div>

            {message ? (
              <p
                className={
                  status === "error" || status === "unsupported"
                    ? "text-sm text-red-600"
                    : "text-sm text-muted-foreground"
                }
              >
                {message}
              </p>
            ) : null}

            {videoUrl ? (
              <div className="space-y-3">
                <VideoEmbed url={videoUrl} title="Aperçu du nouvel enregistrement Loom" />
                <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                  <p>
                    Pour publier cette vidéo, définissez{" "}
                    <code className="font-medium">{envName}</code> dans Netlify avec
                    l&apos;URL ci-dessous, puis redéployez.
                  </p>
                  <div className="mt-2 flex min-w-0 gap-2">
                    <input
                      readOnly
                      value={videoUrl}
                      className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={copyVideoUrl}>
                      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                      {copied ? "Copié" : "Copier"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Loom capture l&apos;écran, la caméra et le microphone. Utilisez le guide du
                tutoriel comme script pendant l&apos;enregistrement.
              </p>
            )}
          </>
        )}

        <Link href="/help/bienvenue-navigation" className="inline-flex text-sm text-brand-700 hover:underline dark:text-brand-300">
          Voir le premier script avant d&apos;enregistrer
        </Link>
      </CardContent>
    </Card>
  );
}
