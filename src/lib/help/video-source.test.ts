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
    expect(parseVideoSource("https://www.youtube.com/watch?v=abc")?.src).toBe(
      "https://www.youtube-nocookie.com/embed/abc?rel=0"
    );
    expect(parseVideoSource("https://m.youtube.com/watch?v=abc")?.type).toBe("youtube");
    expect(parseVideoSource("https://www.loom.com/share/xyz")?.src).toBe("https://www.loom.com/embed/xyz");
    expect(parseVideoSource("https://vimeo.com/123")?.type).toBe("vimeo");
    expect(parseVideoSource("https://player.vimeo.com/video/123")?.src).toBe(
      "https://player.vimeo.com/video/123"
    );
    expect(parseVideoSource("https://cdn.example.com/v.mp4")?.type).toBe("mp4");
  });
  it("refuse les hôtes qui imitent YouTube, Loom ou Vimeo", () => {
    expect(parseVideoSource("https://evil-youtube.com/watch?v=abc")).toBeNull();
    expect(parseVideoSource("https://youtube.com.evil.com/watch?v=abc")).toBeNull();
    expect(parseVideoSource("https://notyoutu.be/abc")).toBeNull();
    expect(parseVideoSource("https://youtu.be.evil.com/abc")).toBeNull();
    expect(parseVideoSource("https://evil-loom.com/share/xyz")).toBeNull();
    expect(parseVideoSource("https://loom.com.evil.com/share/xyz")).toBeNull();
    expect(parseVideoSource("https://evil-vimeo.com/123")).toBeNull();
    expect(parseVideoSource("https://vimeo.com.evil.com/123")).toBeNull();
  });
});
