export type MeetingAudience = "company" | "clients" | "public";
export type MeetingStatus = "scheduled" | "live" | "ended";

export const AUDIENCE_LABELS: Record<MeetingAudience, string> = {
  company: "Équipe",
  clients: "Clients",
  public: "Public",
};

export const STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Planifiée",
  live: "En cours",
  ended: "Terminée",
};

export function audienceLabel(a: string) {
  return AUDIENCE_LABELS[a as MeetingAudience] ?? a;
}

export function statusLabel(s: string) {
  return STATUS_LABELS[s as MeetingStatus] ?? s;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function absoluteAppPath(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
