export type SocialPlatform =
  | "meta"
  | "instagram"
  | "facebook"
  | "google"
  | "linkedin"
  | "tiktok"
  | "youtube";

export type SocialAccount = {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  handle: string;
  status: "connected" | "needs_reauth" | "disconnected";
  adAccountId?: string;
  currency: string;
  connectedAt?: string;
  followers?: number;
};

export type SocialAdCampaign = {
  id: string;
  name: string;
  platform: SocialPlatform;
  accountId: string;
  objective: "leads" | "traffic" | "awareness" | "conversions";
  status: "draft" | "active" | "paused" | "ended";
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  startDate: string;
  endDate?: string;
};

export type T4Box = {
  code: string;
  label: string;
  amount: number;
};

export type T4Slip = {
  id: string;
  taxYear: number;
  employeeId: string;
  employeeName: string;
  sinMasked: string;
  employerName: string;
  employerBn: string;
  province: "QC" | "ON" | "AB" | "BC";
  boxes: T4Box[];
  status: "draft" | "generated" | "filed";
  generatedAt?: string;
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  meta: "Meta Business",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google Ads",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
};
