"use client";

import { Play } from "lucide-react";

type VideoEmbedProps = {
  url?: string;
  title: string;
};

function parseEmbed(url: string): { type: "youtube" | "loom" | "vimeo" | "mp4"; src: string } | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = u.searchParams.get("v");
      if (!id && u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
      if (!id) return null;
      return {
        type: "youtube",
        src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      };
    }

    if (u.hostname.includes("loom.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (!id) return null;
      return {
        type: "loom",
        src: `https://www.loom.com/embed/${id}`,
      };
    }

    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (!id) return null;
      return {
        type: "vimeo",
        src: `https://player.vimeo.com/video/${id}`,
      };
    }

    if (url.match(/\.(mp4|webm)(\?|$)/i)) {
      return { type: "mp4", src: url };
    }

    return null;
  } catch {
    return null;
  }
}

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  if (!url?.trim()) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-slate-50/80 text-center dark:bg-slate-900/40">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
          <Play className="h-6 w-6" />
        </div>
        <div className="max-w-sm px-4">
          <p className="font-medium text-foreground">Vidéo à venir</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Le guide texte ci-dessous est disponible. Ajoutez l&apos;URL YouTube ou Loom dans les
            variables <code className="text-xs">NEXT_PUBLIC_HELP_VIDEO_*</code> sur Netlify.
          </p>
        </div>
      </div>
    );
  }

  const embed = parseEmbed(url);
  if (!embed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        URL vidéo non reconnue. Utilisez YouTube, Loom, Vimeo ou un lien MP4 direct.
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
        title={title}
      >
        <source src={embed.src} />
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
