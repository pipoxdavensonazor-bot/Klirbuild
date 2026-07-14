import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { authSecret } from "@/lib/auth/demo-session";

function keyBytes() {
  const secret = authSecret() || "klirbuild-dev-only-secret-change-me!!";
  return createHash("sha256").update(secret).digest();
}

/** Encrypt TOTP secret at rest: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptTotpSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

export function decryptTotpSecret(stored: string) {
  const [ver, ivB64, tagB64, dataB64] = stored.split(".");
  if (ver !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    // legacy / plain base32 (setup not yet migrated)
    if (/^[A-Z2-7]+=*$/i.test(stored)) return stored;
    throw new Error("Secret TOTP invalide");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
