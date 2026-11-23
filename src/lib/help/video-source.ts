export type VideoSource =
  | { type: "youtube" | "loom" | "vimeo"; src: string }
  | { type: "mp4"; src: string };

/** Hôte exact ou sous-domaine (évite evil-youtube.com et youtube.com.evil.com). */
function isHostOrSubdomain(hostname: string, domain: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  const base = domain.toLowerCase();
  return host === base || host.endsWith("." + base);
}

/** Reconnaît une vidéo hébergée dans l'app (/help-videos/…), un MP4/WebM direct, YouTube, Loom ou Vimeo. */
export function parseVideoSource(url: string): VideoSource | null {
  const raw = url.trim();
  if (!raw) return null;

  // Chemin relatif servi par klirline.app (bucket R2 via le Worker)
  if (raw.startsWith("/")) {
    if (raw.startsWith("//")) return null;
    return /\.(mp4|webm)(\?|$)/i.test(raw) ? { type: "mp4", src: raw } : null;
  }

  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;

    const youtube = isHostOrSubdomain(u.hostname, "youtube.com");
    const youtuBe = isHostOrSubdomain(u.hostname, "youtu.be");
    if (youtube || youtuBe) {
      let id = u.searchParams.get("v");
      if (!id && youtuBe) id = u.pathname.slice(1);
      if (!id) return null;
      return { type: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
    }
    if (isHostOrSubdomain(u.hostname, "loom.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? { type: "loom", src: `https://www.loom.com/embed/${id}` } : null;
    }
    if (isHostOrSubdomain(u.hostname, "vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? { type: "vimeo", src: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (/\.(mp4|webm)(\?|$)/i.test(raw)) return { type: "mp4", src: raw };
    return null;
  } catch {
    return null;
  }
}
