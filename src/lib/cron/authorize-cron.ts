/**
 * Autorisation des routes /api/cron/*.
 * Fail-closed unless CRON_SECRET is set, or explicit ALLOW_INSECURE_CRON=true (local only).
 */
export function authorizeCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return (
      process.env.ALLOW_INSECURE_CRON === "true" &&
      process.env.NODE_ENV !== "production"
    );
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
