import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { generateTotpSecret, verifyTotpCode } from "@/lib/auth/totp";
import {
  createDemoSession,
  parseSessionCookie,
} from "@/lib/auth/demo-session";

describe("TOTP", () => {
  it("génère un secret base32 et valide un code courant", () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThanOrEqual(16);

    const step = 30;
    const counter = Math.floor(Date.now() / 1000 / step);
    // hotp local mirror of implementation
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleaned = secret.replace(/=+$/, "").toUpperCase();
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const c of cleaned) {
      const idx = alphabet.indexOf(c);
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    const key = Buffer.from(out);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const hmac = createHmac("sha1", key).update(buf).digest();
    const offset = hmac[hmac.length - 1]! & 0xf;
    const code =
      ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);
    const otp = (code % 1_000_000).toString().padStart(6, "0");

    expect(verifyTotpCode(secret, otp)).toBe(true);
    expect(verifyTotpCode(secret, "000000")).toBe(false);
  });
});

describe("session HMAC", () => {
  it("signe et vérifie un cookie de session", async () => {
    process.env.BETTER_AUTH_SECRET =
      process.env.BETTER_AUTH_SECRET ||
      "test-secret-at-least-32-chars-long!!";
    const { token, session } = await createDemoSession(
      "smoke@klirline.test",
      "COMPANY_ADMIN",
      "company_test"
    );
    expect(token.includes(".")).toBe(true);
    const parsed = await parseSessionCookie(token);
    expect(parsed?.email).toBe(session.email);
    expect(parsed?.companyId).toBe("company_test");
    expect(await parseSessionCookie(token + "x")).toBeNull();
  });
});
