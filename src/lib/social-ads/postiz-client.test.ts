import { afterEach, describe, expect, it } from "vitest";
import {
  fromPostizPlatform,
  postizAppOrigin,
  TO_POSTIZ,
} from "@/lib/social-ads/postiz-client";

describe("postiz platform mapping", () => {
  it("maps live platforms to Postiz ids", () => {
    expect(TO_POSTIZ.facebook).toBe("facebook");
    expect(TO_POSTIZ.youtube).toBe("youtube");
    expect(TO_POSTIZ.tiktok).toBe("tiktok");
    expect(TO_POSTIZ.instagram).toBe("instagram");
  });

  it("normalizes Postiz identifiers back", () => {
    expect(fromPostizPlatform("instagram-standalone")).toBe("instagram");
    expect(fromPostizPlatform("linkedin-page")).toBe("linkedin");
    expect(fromPostizPlatform("youtube")).toBe("youtube");
    expect(fromPostizPlatform("unknown-net")).toBeNull();
  });
});

describe("postizAppOrigin", () => {
  afterEach(() => {
    delete process.env.POSTIZ_APP_URL;
    delete process.env.POSTIZ_API_BASE_URL;
    delete process.env.POSTIZ_URL;
  });

  it("strips /api/public/v1 from self-host base", () => {
    process.env.POSTIZ_API_BASE_URL =
      "https://postiz-production-073c.up.railway.app/api/public/v1";
    expect(postizAppOrigin()).toBe(
      "https://postiz-production-073c.up.railway.app"
    );
  });
});
