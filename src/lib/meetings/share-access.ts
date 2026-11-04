/** A share link may only open the client ids stamped on that live/meeting. */
export function shareAllowsClient(input: {
  audience: string;
  clientIds: string[];
  clientId: string;
}): boolean {
  if (input.audience !== "clients" && input.audience !== "public") return false;
  if (input.audience === "public") return true;
  const clientId = input.clientId.trim();
  return clientId.length > 0 && input.clientIds.includes(clientId);
}

export function clientIdsForViewer(clientIds: string[], clientId: string): string[] {
  const id = clientId.trim();
  return id && clientIds.includes(id) ? [id] : [];
}
