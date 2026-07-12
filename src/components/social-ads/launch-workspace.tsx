"use client";

import { useRef, useState } from "react";
import { ImagePlus, MessageSquare, Plus, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { useSocialAdsStore } from "@/lib/social-ads/store";
import { formatDate } from "@/lib/utils";
import { useSessionStore } from "@/lib/workforce/session";

const textareaClass =
  "flex min-h-[88px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30";

export function SocialAdLaunchWorkspace({
  onLaunched,
  onClose,
}: {
  onLaunched?: (
    name: string,
    workspace?: {
      headline: string;
      primaryText: string;
      callToAction: string;
      dailyBudget: number;
    }
  ) => void;
  onClose?: () => void;
}) {
  const employeeId = useSessionStore((s) => s.employeeId);
  const userName = useSessionStore((s) => s.userName);
  const employee = { id: employeeId ?? "", name: userName || "Utilisateur" };

  const activeWorkspaceId = useSocialAdsStore((s) => s.activeWorkspaceId);
  const workspace = useSocialAdsStore((s) =>
    s.workspaces.find((w) => w.id === s.activeWorkspaceId)
  );
  const updateWorkspace = useSocialAdsStore((s) => s.updateWorkspace);
  const addPhoto = useSocialAdsStore((s) => s.addPhoto);
  const removePhoto = useSocialAdsStore((s) => s.removePhoto);
  const updateTableRow = useSocialAdsStore((s) => s.updateTableRow);
  const addTableRow = useSocialAdsStore((s) => s.addTableRow);
  const removeTableRow = useSocialAdsStore((s) => s.removeTableRow);
  const addComment = useSocialAdsStore((s) => s.addComment);
  const launchWorkspace = useSocialAdsStore((s) => s.launchWorkspace);

  const fileRef = useRef<HTMLInputElement>(null);
  const [commentDraft, setCommentDraft] = useState("");

  if (!activeWorkspaceId || !workspace) return null;

  const workspaceId = activeWorkspaceId;
  const workspaceName = workspace.name;

  function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          addPhoto(workspaceId, {
            name: file.name,
            dataUrl: reader.result,
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function submitComment() {
    const body = commentDraft.trim();
    if (!body) return;
    addComment(workspaceId, {
      authorId: employee.id,
      authorName: employee.name,
      body,
    });
    setCommentDraft("");
  }

  function handleLaunch() {
    if (!workspace) return;
    launchWorkspace(workspaceId);
    const budgetRow = workspace.tableRows.find((r) =>
      r.label.toLowerCase().includes("budget")
    );
    const dailyBudget = Number(budgetRow?.value) || workspace.dailyBudget || 50;
    onLaunched?.(workspaceName, {
      headline: workspace.headline,
      primaryText: workspace.primaryText,
      callToAction: workspace.callToAction,
      dailyBudget,
    });
  }

  return (
    <Card className="border-brand-200 bg-brand-50/30 dark:border-brand-900 dark:bg-brand-950/20">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">
            Espace pub — {workspace.name}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Textes, visuels, paramètres et commentaires synchronisés dans
            l&apos;application.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={workspace.status} />
          {onClose ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Textes de la publicité
            </p>
            <Input
              placeholder="Titre accrocheur"
              value={workspace.headline}
              onChange={(e) =>
                updateWorkspace(workspaceId, { headline: e.target.value })
              }
            />
            <textarea
              className={textareaClass}
              placeholder="Texte principal de la pub…"
              value={workspace.primaryText}
              onChange={(e) =>
                updateWorkspace(workspaceId, { primaryText: e.target.value })
              }
            />
            <Input
              placeholder="Appel à l'action (ex. En savoir plus)"
              value={workspace.callToAction}
              onChange={(e) =>
                updateWorkspace(workspaceId, { callToAction: e.target.value })
              }
            />
            <textarea
              className={textareaClass}
              placeholder="Notes internes pour l'équipe marketing…"
              value={workspace.notes}
              onChange={(e) =>
                updateWorkspace(workspaceId, { notes: e.target.value })
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Visuels
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Ajouter photo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files)}
              />
            </div>
            {workspace.photos.length === 0 ? (
              <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                Aucune image — cliquez sur « Ajouter photo »
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {workspace.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-lg border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      onClick={() => removePhoto(workspaceId, photo.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <p className="truncate px-2 py-1 text-[10px] text-muted-foreground">
                      {photo.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Paramètres (tableau)
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addTableRow(workspaceId)}
            >
              <Plus className="h-3.5 w-3.5" />
              Ligne
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Champ</th>
                  <th className="px-3 py-2">Valeur</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {workspace.tableRows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      <Input
                        value={row.label}
                        onChange={(e) =>
                          updateTableRow(workspaceId, row.id, {
                            label: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={row.value}
                        onChange={(e) =>
                          updateTableRow(workspaceId, row.id, {
                            value: e.target.value,
                          })
                        }
                        className="h-8"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTableRow(workspaceId, row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-brand-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Commentaires synchronisés
            </p>
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {workspace.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun commentaire — l&apos;équipe marketing peut collaborer ici.
              </p>
            ) : (
              workspace.comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2"
                >
                  <p className="text-xs font-medium">
                    {c.authorName}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {formatDate(c.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm">{c.body}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ajouter un commentaire…"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
            />
            <Button type="button" onClick={submitComment}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button type="button" onClick={handleLaunch}>
            Publier la publicité
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
