import { createHash, randomBytes } from "crypto";

/** SHA-256 hex of a high-entropy raw token (reset / invite). */
export function hashOpaqueToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
