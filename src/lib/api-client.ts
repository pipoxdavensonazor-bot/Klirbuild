export async function parseApiResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      res.ok
        ? "Réponse serveur invalide"
        : `Erreur serveur (${res.status}). Réessayez sur https://www.klirline.app`
    );
  }
}
