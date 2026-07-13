/** Netlify redirige www → apex ; les POST doivent cibler klirline.app directement. */
export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "www.klirline.app"
  ) {
    return `https://klirline.app${normalized}`;
  }
  return normalized;
}

export async function parseApiResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "Réponse serveur invalide"
        : `Erreur serveur (${res.status}). Réessayez sur https://klirline.app`
    );
  }
}
