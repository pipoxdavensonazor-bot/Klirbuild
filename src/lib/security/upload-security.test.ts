import { describe, expect, it } from "vitest";
import {
  normalizeUploadContentType,
  resolveServeHeaders,
  sniffContentType,
} from "@/lib/security/upload-security";

function pngBytes() {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
  ]);
}

describe("upload-security", () => {
  it("détecte PNG via magic bytes", () => {
    expect(sniffContentType(pngBytes())).toBe("image/png");
  });

  it("refuse text/html même déclaré", () => {
    const result = normalizeUploadContentType({
      declaredType: "text/html",
      key: "docs/x.html",
      bytes: new TextEncoder().encode("<script>alert(1)</script>"),
    });
    expect(result.ok).toBe(false);
  });

  it("force attachment + nosniff pour types dangereux au serve", () => {
    const { headers, contentType, contentDisposition } = resolveServeHeaders({
      storedContentType: "text/html",
      key: "marketing/co/evil.html",
      bytes: new TextEncoder().encode("<html>x</html>"),
    });
    expect(contentType).toBe("application/octet-stream");
    expect(contentDisposition.startsWith("attachment")).toBe(true);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("sert les images en inline après sniff", () => {
    const { contentType, contentDisposition } = resolveServeHeaders({
      storedContentType: "application/octet-stream",
      key: "marketing/co/pic.bin",
      bytes: pngBytes(),
    });
    expect(contentType).toBe("image/png");
    expect(contentDisposition.startsWith("inline")).toBe(true);
  });

  it("accepte un PNG marketing déclaré correctement", () => {
    const result = normalizeUploadContentType({
      declaredType: "image/png",
      key: "marketing/co/a.png",
      bytes: pngBytes(),
      allowed: new Set(["image/png", "image/jpeg"]),
    });
    expect(result).toEqual({ ok: true, contentType: "image/png" });
  });
});
