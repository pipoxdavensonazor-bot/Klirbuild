import { hasDatabase } from "@/lib/auth/auth-service";
import { DATABASE_REQUIRED_MESSAGE } from "@/lib/api/database-guard";

/** Postgres requis — les routes API sont bloquées sans DATABASE_URL (middleware). */
export function isDemoMode() {
  return !hasDatabase();
}

export { DATABASE_REQUIRED_MESSAGE };
