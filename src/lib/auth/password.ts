import { randomBytes, scrypt, timingSafeEqual, pbkdf2 } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const pbkdf2Async = promisify(pbkdf2);

/** Lighter than Node default scrypt — safe for Cloudflare Workers CPU limits. */
const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await pbkdf2Async(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  )) as Buffer;
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;

  if (stored.startsWith("pbkdf2:")) {
    const parts = stored.split(":");
    if (parts.length !== 4) return false;
    const iterations = Number(parts[1]);
    const salt = parts[2];
    const hash = parts[3];
    if (!iterations || !salt || !hash) return false;
    const derived = (await pbkdf2Async(
      password,
      salt,
      iterations,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST
    )) as Buffer;
    const expected = Buffer.from(hash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }

  // Legacy scrypt: salt:hash
  if (!stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
