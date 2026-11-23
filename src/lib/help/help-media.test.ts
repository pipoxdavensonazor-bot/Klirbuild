import { describe, expect, it } from "vitest";
import { helpMediaKey, serveHelpMedia, type HelpMediaBucket } from "./help-media";

function fakeBucket(size = 1000): HelpMediaBucket & { lastKey?: string } {
  const b: HelpMediaBucket & { lastKey?: string } = {
    async get(key, options) {
      b.lastKey = key;
      if (key.startsWith("absent")) return null;
      const range = options?.range?.get("range");
      const m = range?.match(/bytes=(\d*)-(\d*)/);
      let r: { offset?: number; length?: number; suffix?: number } | undefined;
      if (m) {
        if (m[1] === "") r = { suffix: Number(m[2]) };
        else r = { offset: Number(m[1]), length: m[2] ? Number(m[2]) - Number(m[1]) + 1 : undefined };
      }
      return {
        size,
        httpEtag: '"abc"',
        range: r,
        writeHttpMetadata(h: Headers) {
          if (key.endsWith(".mp4")) h.set("content-type", "video/mp4");
        },
        body: new ReadableStream(),
      };
    },
  };
  return b;
}

describe("helpMediaKey", () => {
  it("accepte les fichiers de tutoriels", () => {
    expect(helpMediaKey("/help-videos/01-bienvenue-navigation.mp4")).toBe("01-bienvenue-navigation.mp4");
    expect(helpMediaKey("/help-videos/01-bienvenue-navigation.fr.vtt")).toBe("01-bienvenue-navigation.fr.vtt");
  });
  it("refuse les chemins douteux", () => {
    expect(helpMediaKey("/help-videos/../secret.mp4")).toBeNull();
    expect(helpMediaKey("/help-videos/a/b.mp4")).toBeNull();
    expect(helpMediaKey("/help-videos/x.exe")).toBeNull();
  });
});

describe("serveHelpMedia", () => {
  it("ignore les autres chemins", async () => {
    expect(await serveHelpMedia(new Request("https://klirline.app/help"), fakeBucket())).toBeNull();
  });

  it("renvoie 206 avec Content-Range pour une requête Range", async () => {
    const res = await serveHelpMedia(
      new Request("https://klirline.app/help-videos/01-a.mp4", { headers: { range: "bytes=0-99" } }),
      fakeBucket()
    );
    expect(res?.status).toBe(206);
    expect(res?.headers.get("content-range")).toBe("bytes 0-99/1000");
    expect(res?.headers.get("content-length")).toBe("100");
    expect(res?.headers.get("accept-ranges")).toBe("bytes");
  });

  it("gère les plages suffixes (bytes=-200)", async () => {
    const res = await serveHelpMedia(
      new Request("https://klirline.app/help-videos/01-a.mp4", { headers: { range: "bytes=-200" } }),
      fakeBucket()
    );
    expect(res?.headers.get("content-range")).toBe("bytes 800-999/1000");
  });

  it("renvoie 200 sans Range, 404 si absent, 405 si POST", async () => {
    const ok = await serveHelpMedia(new Request("https://klirline.app/help-videos/01-a.mp4"), fakeBucket());
    expect(ok?.status).toBe(200);
    expect(ok?.headers.get("content-length")).toBe("1000");
    const vtt = await serveHelpMedia(new Request("https://klirline.app/help-videos/01-a.fr.vtt"), fakeBucket());
    expect(vtt?.headers.get("content-type")).toContain("text/vtt");
    const missing = await serveHelpMedia(new Request("https://klirline.app/help-videos/absent.mp4"), fakeBucket());
    expect(missing?.status).toBe(404);
    const post = await serveHelpMedia(
      new Request("https://klirline.app/help-videos/01-a.mp4", { method: "POST" }),
      fakeBucket()
    );
    expect(post?.status).toBe(405);
  });

  it("renvoie 404 si le bucket n'est pas lié", async () => {
    const res = await serveHelpMedia(new Request("https://klirline.app/help-videos/01-a.mp4"), undefined);
    expect(res?.status).toBe(404);
  });
});
