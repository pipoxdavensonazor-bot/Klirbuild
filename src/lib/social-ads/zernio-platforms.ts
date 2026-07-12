import type { SocialPlatform } from "@/lib/reports/types";

/** KlirBuild platform → Zernio API platform value */
export const TO_ZERNIO: Record<SocialPlatform, string> = {
  meta: "facebook",
  facebook: "facebook",
  instagram: "instagram",
  google: "googlebusiness",
  linkedin: "linkedin",
  tiktok: "tiktok",
  youtube: "youtube",
};

/** Zernio platform → KlirBuild slot */
export function fromZernioPlatform(zernioPlatform: string): SocialPlatform | null {
  const p = zernioPlatform.toLowerCase();
  if (p === "facebook") return "facebook";
  if (p === "instagram") return "instagram";
  if (p === "linkedin") return "linkedin";
  if (p === "tiktok") return "tiktok";
  if (p === "youtube") return "youtube";
  if (p === "googlebusiness" || p === "google") return "google";
  if (p === "twitter" || p === "threads") return "meta";
  return null;
}

/** Créneaux audience recommandés (style Metricool) — heures locales */
export const AUDIENCE_PEAK_HOURS: Record<
  SocialPlatform,
  { weekday: number[]; weekend: number[]; label: string }
> = {
  meta: { weekday: [9, 12, 17], weekend: [10, 14], label: "Facebook / Meta" },
  facebook: { weekday: [9, 12, 17], weekend: [10, 14], label: "Facebook" },
  instagram: { weekday: [11, 13, 19], weekend: [10, 15], label: "Instagram" },
  linkedin: { weekday: [8, 10, 12], weekend: [9], label: "LinkedIn" },
  tiktok: { weekday: [12, 15, 21], weekend: [11, 16, 20], label: "TikTok" },
  youtube: { weekday: [14, 16, 20], weekend: [11, 15], label: "YouTube" },
  google: { weekday: [9, 11, 14], weekend: [10], label: "Google Business" },
};

export function audienceSlotsForPlatform(platform: SocialPlatform) {
  const cfg = AUDIENCE_PEAK_HOURS[platform];
  const now = new Date();
  const slots: Array<{ day: string; hour: number; score: number; label: string }> = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const hours = isWeekend ? cfg.weekend : cfg.weekday;
    const dayLabel = date.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });
    hours.forEach((hour, i) => {
      slots.push({
        day: dayLabel,
        hour,
        score: 100 - i * 8 - d * 3,
        label: `${dayLabel} · ${hour}h00`,
      });
    });
  }
  return slots.sort((a, b) => b.score - a.score).slice(0, 12);
}
