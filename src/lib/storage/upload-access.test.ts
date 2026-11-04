import { describe, expect, it } from "vitest";
import {
  companyIdFromUploadKey,
  signUploadKey,
  uploadSignatureTtlSec,
  verifyUploadSignature,
} from "@/lib/storage/upload-access";

const SECRET = "test-secret-at-least-32-characters!!";

describe("upload access", () => {
  it("extrait le companyId des préfixes connus", () => {
    expect(companyIdFromUploadKey("team-chat/co_1/file.pdf")).toBe("co_1");
    expect(companyIdFromUploadKey("marketing/co_1/a.png")).toBe("co_1");
    expect(companyIdFromUploadKey("documents/co_1/b.pdf")).toBe("co_1");
    expect(companyIdFromUploadKey("other/co_1/a")).toBeNull();
    expect(companyIdFromUploadKey("team-chat/co_1")).toBeNull();
  });

  it("accepte une signature valide et refuse une signature expirée ou altérée", () => {
    process.env.BETTER_AUTH_SECRET = SECRET;
    const key = "team-chat/co_1/plan.pdf";
    const now = 1_700_000_000_000;
    const exp = Math.floor(now / 1000) + 60;
    const sig = signUploadKey(key, exp);
    expect(verifyUploadSignature(key, String(exp), sig, now)).toBe(true);
    expect(verifyUploadSignature(key, String(exp - 120), sig, now)).toBe(false);
    expect(verifyUploadSignature(key, String(exp), `${sig}x`, now)).toBe(false);
    expect(verifyUploadSignature("team-chat/co_2/plan.pdf", String(exp), sig, now)).toBe(false);
  });

  it("signe team-chat plus court que le marketing", () => {
    expect(uploadSignatureTtlSec("team-chat/co/a.pdf")).toBe(3600);
    expect(uploadSignatureTtlSec("marketing/co/a.png")).toBe(7 * 24 * 3600);
  });
});
