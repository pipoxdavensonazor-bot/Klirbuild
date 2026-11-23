"use client";

import { Play } from "lucide-react";
import { parseVideoSource } from "@/lib/help/video-source";

type VideoEmbedProps = {
  url?: string;
  title: string;
  /** Sous-titres WebVTT (même origine), ex. /help-videos/01-bienvenue-navigation.fr.vtt */
  captions?: string;
  /** Image d'aperçu affichée avant la lecture */
  poster?: string;
};

export function VideoEmbed({ url, title, captions, poster }: VideoEmbedProps) {
  if (!url?.trim()) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-slate-50/80 text-center dark:bg-slate-900/40">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
          <Play className="h-6 w-6" />
        </div>
        <div className="max-w-sm px-4">
          <p className="font-medium text-foreground">Vidéo à venir</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Le tutoriel vidéo est en préparation. Le guide pas à pas ci-dessous est déjà
            disponible.
          </p>
        </div>
      </div>
    );
  }

  const embed = parseVideoSource(url);
  if (!embed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        URL vidéo non reconnue. Utilisez une vidéo hébergée dans KlirBuild (/help-videos/…), un
        lien MP4 direct, YouTube, Loom ou Vimeo.
      </div>
    );
  }

  if (embed.type === "mp4") {
    return (
      <video
        className="aspect-video w-full rounded-xl border border-border bg-black"
        controls
        playsInline
        preload="metadata"
        poster={poster}
        title={title}
        aria-label={title}
      >
        <source src={embed.src} type={embed.src.match(/\.webm(\?|$)/i) ? "video/webm" : "video/mp4"} />
        {captions ? (
          <track kind="subtitles" src={captions} srcLang="fr" label="Français" default />
        ) : null}
        Votre navigateur ne peut pas lire cette vidéo.
      </video>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-black shadow-sm">
      <iframe
        src={embed.src}
        title={title}
        className="aspect-video w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
