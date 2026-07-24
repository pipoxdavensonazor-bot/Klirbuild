/** Netlify redirige www → apex ; les POST doivent cibler klirline.app directement. */
export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return normalized;

  const host = window.location.hostname;
  // Cross-origin only when the page is not already on the API host.
  if (host === "www.klirline.app" || host.endsWith(".workers.dev")) {
    return `https://klirline.app${normalized}`;
  }
  return normalized;
}

export function networkErrorMessage(err: unknown) {
  const raw = err instanceof Error ? err.message : "";
  if (/failed to fetch|networkerror|load failed|fetch/i.test(raw)) {
    return "Connexion au serveur impossible. Vérifiez votre réseau, désactivez les bloqueurs, puis réessayez sur https://klirline.app";
  }
  return raw || "Erreur réseau";
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
