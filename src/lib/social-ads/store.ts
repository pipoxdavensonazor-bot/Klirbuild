"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SocialAdComment,
  SocialAdPhoto,
  SocialAdTableRow,
  SocialAdWorkspace,
} from "@/lib/social-ads/types";

const DEFAULT_ROWS: Omit<SocialAdTableRow, "id">[] = [
  { label: "Audience cible", value: "" },
  { label: "Budget quotidien ($)", value: "50" },
  { label: "Durée (jours)", value: "14" },
  { label: "URL destination", value: "" },
];

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultRows(): SocialAdTableRow[] {
  return DEFAULT_ROWS.map((r) => ({ ...r, id: newId("row") }));
}

type SocialAdsState = {
  workspaces: SocialAdWorkspace[];
  activeWorkspaceId: string | null;
  createWorkspace: (input: {
    name: string;
    platform: string;
    accountId: string;
  }) => string;
  setActiveWorkspace: (id: string | null) => void;
  updateWorkspace: (
    id: string,
    patch: Partial<
      Pick<
        SocialAdWorkspace,
        | "name"
        | "headline"
        | "primaryText"
        | "callToAction"
        | "notes"
        | "status"
        | "dailyBudget"
      >
    >
  ) => void;
  addPhoto: (workspaceId: string, photo: Omit<SocialAdPhoto, "id" | "addedAt">) => void;
  removePhoto: (workspaceId: string, photoId: string) => void;
  updateTableRow: (
    workspaceId: string,
    rowId: string,
    patch: Partial<Pick<SocialAdTableRow, "label" | "value">>
  ) => void;
  addTableRow: (workspaceId: string) => void;
  removeTableRow: (workspaceId: string, rowId: string) => void;
  addComment: (
    workspaceId: string,
    comment: Omit<SocialAdComment, "id" | "createdAt">
  ) => void;
  launchWorkspace: (workspaceId: string) => void;
};

export const useSocialAdsStore = create<SocialAdsState>()(
  persist(
    (set) => ({
      workspaces: [],
      activeWorkspaceId: null,

      createWorkspace: ({ name, platform, accountId }) => {
        const id = newId("ad");
        const now = new Date().toISOString();
        const workspace: SocialAdWorkspace = {
          id,
          name,
          platform,
          accountId,
          status: "draft",
          headline: "",
          primaryText: "",
          callToAction: "En savoir plus",
          notes: "",
          photos: [],
          tableRows: defaultRows(),
          comments: [],
          dailyBudget: 50,
          spend: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
          startDate: now.slice(0, 10),
          updatedAt: now,
        };
        set((s) => ({
          workspaces: [workspace, ...s.workspaces],
          activeWorkspaceId: id,
        }));
        return id;
      },

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

      updateWorkspace: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, ...patch, updatedAt: now } : w
          ),
        }));
      },

      addPhoto: (workspaceId, photo) => {
        const item: SocialAdPhoto = {
          ...photo,
          id: newId("photo"),
          addedAt: new Date().toISOString(),
        };
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, photos: [...w.photos, item], updatedAt: now }
              : w
          ),
        }));
      },

      removePhoto: (workspaceId, photoId) => {
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  photos: w.photos.filter((p) => p.id !== photoId),
                  updatedAt: now,
                }
              : w
          ),
        }));
      },

      updateTableRow: (workspaceId, rowId, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  tableRows: w.tableRows.map((r) =>
                    r.id === rowId ? { ...r, ...patch } : r
                  ),
                  updatedAt: now,
                }
              : w
          ),
        }));
      },

      addTableRow: (workspaceId) => {
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  tableRows: [
                    ...w.tableRows,
                    { id: newId("row"), label: "Nouvelle ligne", value: "" },
                  ],
                  updatedAt: now,
                }
              : w
          ),
        }));
      },

      removeTableRow: (workspaceId, rowId) => {
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? {
                  ...w,
                  tableRows: w.tableRows.filter((r) => r.id !== rowId),
                  updatedAt: now,
                }
              : w
          ),
        }));
      },

      addComment: (workspaceId, comment) => {
        const item: SocialAdComment = {
          ...comment,
          id: newId("cmt"),
          createdAt: new Date().toISOString(),
        };
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, comments: [...w.comments, item], updatedAt: now }
              : w
          ),
        }));
      },

      launchWorkspace: (workspaceId) => {
        const now = new Date().toISOString();
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === workspaceId
              ? { ...w, status: "active", startDate: now.slice(0, 10), updatedAt: now }
              : w
          ),
        }));
      },
    }),
    { name: "klirline-social-ads-workspaces" }
  )
);
