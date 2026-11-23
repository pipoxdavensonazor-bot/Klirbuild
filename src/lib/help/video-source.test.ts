import { describe, expect, it } from "vitest";
import { parseVideoSource } from "./video-source";

describe("parseVideoSource", () => {
  it("accepte les vidéos hébergées dans l'app", () => {
    expect(parseVideoSource("/help-videos/01-bienvenue-navigation.mp4")).toEqual({
      type: "mp4",
      src: "/help-videos/01-bienvenue-navigation.mp4",
    });
  });
  it("refuse les URL protocole-relatif et les chemins non vidéo", () => {
    expect(parseVideoSource("//evil.example/x.mp4")).toBeNull();
    expect(parseVideoSource("/help-videos/x.vtt")).toBeNull();
    expect(parseVideoSource("javascript:alert(1)")).toBeNull();
  });
  it("garde YouTube / Loom / Vimeo / MP4 absolu", () => {
    expect(parseVideoSource("https://youtu.be/abc")?.type).toBe("youtube");
    expect(parseVideoSource("https://www.loom.com/share/xyz")?.src).toBe("https://www.loom.com/embed/xyz");
    expect(parseVideoSource("https://vimeo.com/123")?.type).toBe("vimeo");
    expect(parseVideoSource("https://cdn.example.com/v.mp4")?.type).toBe("mp4");
  });
});
