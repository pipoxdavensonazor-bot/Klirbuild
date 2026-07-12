import { hasDatabase } from "@/lib/auth/auth-service";

/** Données démo/mock uniquement quand Postgres n'est pas configuré. */
export function isDemoMode() {
  return !hasDatabase();
}
