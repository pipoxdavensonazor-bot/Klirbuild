import { cookies } from "next/headers";

const COOKIE = "leonne_admin_session";

function expectedToken() {
  const password = process.env.ADMIN_PASSWORD || "LeonneAdmin2026";
  const secret = process.env.ADMIN_SECRET || password;
  return hash(`${password}::${secret}`);
}

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return `adm_${Math.abs(h).toString(16)}_${input.length}`;
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "LeonneAdmin2026";
}

export function verifyAdminPassword(password: string) {
  return password === getAdminPassword();
}

export function createSessionValue() {
  return expectedToken();
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  return Boolean(value && value === expectedToken());
}

export function sessionCookieOptions(value: string) {
  return {
    name: COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  };
}

export function clearSessionCookieOptions() {
  return {
    name: COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
