import { afterEach, describe, expect, it } from "vitest";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";

describe("authorizeCronRequest", () => {
  const prevSecret = process.env.CRON_SECRET;
  const prevAllow = process.env.ALLOW_INSECURE_CRON;

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prevSecret;
    if (prevAllow === undefined) delete process.env.ALLOW_INSECURE_CRON;
    else process.env.ALLOW_INSECURE_CRON = prevAllow;
  });

  it("refuse sans secret (fail-closed)", () => {
    delete process.env.CRON_SECRET;
    delete process.env.ALLOW_INSECURE_CRON;
    const req = new Request("https://x/api/cron", {
      headers: { authorization: "Bearer x" },
    });
    expect(authorizeCronRequest(req)).toBe(false);
  });

  it("accepte Bearer CRON_SECRET", () => {
    process.env.CRON_SECRET = "s3cret";
    const req = new Request("https://x/api/cron", {
      headers: { authorization: "Bearer s3cret" },
    });
    expect(authorizeCronRequest(req)).toBe(true);
  });
});
