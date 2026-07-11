export type SocialAdWorkspaceStatus = "draft" | "active" | "paused" | "ended";

export type SocialAdPhoto = {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
};

export type SocialAdTableRow = {
  id: string;
  label: string;
  value: string;
};

export type SocialAdComment = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type SocialAdWorkspace = {
  id: string;
  name: string;
  platform: string;
  accountId: string;
  status: SocialAdWorkspaceStatus;
  headline: string;
  primaryText: string;
  callToAction: string;
  notes: string;
  photos: SocialAdPhoto[];
  tableRows: SocialAdTableRow[];
  comments: SocialAdComment[];
  dailyBudget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  startDate: string;
  updatedAt: string;
};
