import { cookies } from "next/headers";
import {
  createSessionToken,
  getAdminPassword,
  getAdminSecretsError,
  sessionTokenMatches,
  verifyAdminPassword,
} from "@/lib/admin-session";

export {
  createSessionToken,
  getAdminPassword,
  getAdminSecretsError,
  verifyAdminPassword,
} from "@/lib/admin-session";

const COOKIE = "leonne_admin_session";

/** @deprecated use createSessionToken — kept as async alias */
export async function createSessionValue() {
  return createSessionToken();
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  return sessionTokenMatches(value);
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
