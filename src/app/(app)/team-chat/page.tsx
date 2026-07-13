"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Lock, Paperclip, Plus, Send, Shield, Users, X } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  at: string;
  encrypted: boolean;
  attachments: ChatAttachment[];
};

type ChatAttachment = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
};

type Channel = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  encrypted: boolean;
  allowedRoles: string[];
  members: { email: string; role?: string | null }[];
};

type ChatUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ROLE_OPTIONS = [
  ["COMPANY_ADMIN", "Administrateurs"],
  ["PROJECT_MANAGER", "Chefs de projet"],
  ["SITE_SUPERVISOR", "Surintendants"],
  ["FOREMAN", "Contremaîtres"],
  ["FIELD_WORKER", "Employés terrain"],
  ["ESTIMATOR", "Estimateurs"],
  ["ACCOUNTANT", "Comptables"],
  ["HR_MANAGER", "RH"],
  ["OFFICE_ADMIN", "Bureau"],
] as const;

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function errorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return fallback;
}

function readAttachment(data: unknown): ChatAttachment | null {
  if (!data || typeof data !== "object" || !("attachment" in data)) return null;
  const attachment = (data as { attachment?: unknown }).attachment;
  if (!attachment || typeof attachment !== "object") return null;
  return attachment as ChatAttachment;
}

function readChannelId(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("channel" in data)) return null;
  const channel = (data as { channel?: unknown }).channel;
  if (!channel || typeof channel !== "object" || !("id" in channel)) return null;
  const id = (channel as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

export default function TeamChatPage() {
  return (
    <RequirePermission permission="chat:use">
      <TeamChatInner />
    </RequirePermission>
  );
}

function TeamChatInner() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [meEmail, setMeEmail] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const load = useCallback(async () => {
    const q = channelId ? `?channelId=${encodeURIComponent(channelId)}` : "";
    const res = await fetch(apiUrl(`/api/team-chat${q}`), { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    setChannels(data.channels ?? []);
    setMessages(data.messages ?? []);
    setUsers(data.users ?? []);
    if (data.me?.email) setMeEmail(data.me.email);
    if (!channelId && data.channelId) setChannelId(data.channelId);
  }, [channelId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(id);
  }, [load]);

  async function send() {
    const body = draft.trim();
    if (!body && !attachments.length) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/team-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body, channelId, attachments }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setNotice(errorMessage(data, "Envoi échoué."));
        return;
      }
      setDraft("");
      setAttachments([]);
      if (data.message) {
        setMessages((prev) => [...prev, data.message as ChatMessage]);
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(apiUrl("/api/team-chat/attachments"), {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setNotice(errorMessage(data, "Upload échoué."));
        return;
      }
      const attachment = readAttachment(data);
      if (attachment) {
        setAttachments((prev) => [...prev, attachment]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function createGroup() {
    const name = groupName.trim();
    if (!name) return;
    setLoading(true);
    setNotice("");
    try {
      const res = await fetch(apiUrl("/api/team-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "create-channel",
          name,
          description: groupDescription,
          allowedRoles: selectedRoles,
          memberEmails: selectedMembers,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setNotice(errorMessage(data, "Création du groupe échouée."));
        return;
      }
      setGroupName("");
      setGroupDescription("");
      setSelectedRoles([]);
      setSelectedMembers([]);
      setGroupOpen(false);
      const newChannelId = readChannelId(data);
      if (newChannelId) setChannelId(newChannelId);
      await load();
    } finally {
      setLoading(false);
    }
  }

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const channel = channels.find((c) => c.id === channelId);

  return (
    <div>
      <PageHeader
        title="Canaux de discussion"
        description="Créez des groupes par équipe, rôle ou employé, puis partagez messages, photos, PDF et documents."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-slate-50/80 px-4 py-3 text-sm dark:bg-slate-900/40">
        <Shield className="h-4 w-4 text-brand-500" />
        <span>
          TLS en transit · chiffrement au repos · canaux entreprise et chantiers · accessible à
          chaque rôle selon les accès du groupe.
        </span>
      </div>

      {notice ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader className="space-y-3">
            <CardTitle className="text-sm">Canaux</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setGroupOpen((v) => !v)}>
              <Plus className="h-4 w-4" />
              Nouveau groupe
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {groupOpen ? (
              <div className="mb-4 space-y-3 rounded-lg border border-border bg-slate-50 p-3 dark:bg-slate-900/30">
                <Input
                  placeholder="Nom du groupe"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <Input
                  placeholder="Description optionnelle"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Rôles autorisés</p>
                  <div className="space-y-1">
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(value)}
                          onChange={() => toggle(selectedRoles, value, setSelectedRoles)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Employés spécifiques</p>
                  <div className="max-h-36 space-y-1 overflow-y-auto">
                    {users.map((u) => (
                      <label key={u.email} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(u.email)}
                          onChange={() => toggle(selectedMembers, u.email, setSelectedMembers)}
                        />
                        <span className="truncate">{u.name || u.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button size="sm" className="w-full" disabled={loading} onClick={() => void createGroup()}>
                  Créer le groupe
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Sans rôle ni employé sélectionné, le groupe est visible à toute l’entreprise.
                </p>
              </div>
            ) : null}

            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setChannelId(ch.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                  channelId === ch.id
                    ? "bg-brand-500 text-white"
                    : "hover:bg-slate-100 dark:hover:bg-slate-900"
                )}
              >
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 opacity-70" />
                  {ch.name}
                </span>
                <span className="text-[10px] opacity-80">
                  {ch.type === "company" ? "Tous" : ch.allowedRoles.length ? "Rôles" : "Groupe"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-accent-500" />
              {channel?.name ?? "Canal"}
              <span className="text-xs font-normal text-muted-foreground">· chiffré</span>
            </CardTitle>
            {channel?.description ? (
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            ) : null}
            {channel && channel.type !== "company" ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {channel.allowedRoles.length
                  ? `Rôles : ${channel.allowedRoles.join(", ")}`
                  : "Accès par membres ou groupe ouvert"}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="flex h-[520px] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-slate-50/50 p-4 dark:bg-slate-900/30">
              {messages.map((msg) => {
                const mine = msg.senderId === meEmail;
                return (
                  <div
                    key={msg.id}
                    className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                  >
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      {msg.senderName} · {formatDate(msg.at)}
                      {msg.encrypted ? " · chiffré" : ""}
                    </p>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                        mine
                          ? "bg-brand-500 text-white"
                          : "border border-border bg-background"
                      )}
                    >
                      {msg.body}
                      {msg.attachments?.length ? (
                        <div className="mt-2 space-y-2">
                          {msg.attachments.map((file) => (
                            <a
                              key={file.storageKey}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                                mine ? "bg-white/15" : "bg-slate-100 dark:bg-slate-900"
                              )}
                            >
                              {file.mimeType.startsWith("image/") ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              <span className="truncate">{file.name}</span>
                              <span className="opacity-70">{formatBytes(file.sizeBytes)}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {attachments.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <span
                    key={file.storageKey}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    {file.name}
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((a) => a.storageKey !== file.storageKey))
                      }
                      aria-label="Retirer le fichier"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Message sécurisé au groupe…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
              />
              <Button disabled={loading || uploading} onClick={() => void send()}>
                <Send className="h-4 w-4" />
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
