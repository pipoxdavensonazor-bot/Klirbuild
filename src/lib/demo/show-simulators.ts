/**
 * UI plan/role/market simulators — demo accounts only (or explicit flag).
 * Never trust these client toggles for server-side authorization.
 */
export function showPlanRoleSimulators(userEmail?: string | null) {
  if (process.env.NEXT_PUBLIC_ENABLE_SIMULATORS === "true") return true;
  const email = (userEmail ?? "").trim().toLowerCase();
  return email.endsWith("@klirline.demo");
}
