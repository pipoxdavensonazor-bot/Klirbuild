"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { demoUser } from "@/lib/mock-data";
import type { Role } from "@/types";

type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type ApiInvitation = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
};

export function SettingsUsersPanel() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [invitations, setInvitations] = useState<ApiInvitation[]>([]);
  const [requiresDatabase, setRequiresDatabase] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("EMPLOYEE");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de charger les utilisateurs");
        return;
      }
      setRequiresDatabase(Boolean(data.requiresDatabase));
      setUsers(data.users ?? []);
      setInvitations(data.invitations ?? []);
    } catch {
      setError("Erreur réseau");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendInvite() {
    setError("");
    setMessage("");
    setInviteUrl("");
    const email = inviteEmail.trim();
    if (!email) {
      setError("Entrez un courriel");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invitation échouée");
        return;
      }
      setInviteEmail("");
      setMessage(`Invitation envoyée à ${data.invitation.email}`);
      setInviteUrl(data.inviteUrl);
      await load();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function copyInviteUrl() {
    if (!inviteUrl) return;
    void navigator.clipboard.writeText(inviteUrl);
    setMessage("Lien d'invitation copié dans le presse-papiers.");
  }

  const displayUsers =
    users.length > 0
      ? users
      : [
          {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            role: demoUser.role,
            createdAt: new Date().toISOString(),
          },
        ];

  return (
    <div className="space-y-4">
      {requiresDatabase ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Ajoutez <code className="font-mono text-xs">DATABASE_URL</code> sur Vercel
          (Neon/Supabase) pour inviter des utilisateurs et créer des comptes.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
          {inviteUrl ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="block max-w-full truncate rounded bg-white/60 px-2 py-1 text-xs dark:bg-black/30">
                {inviteUrl}
              </code>
              <Button size="sm" variant="outline" onClick={copyInviteUrl}>
                Copier le lien
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
          >
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <StatusBadge status={user.role} />
          </div>
        ))}
      </div>

      {invitations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Invitations en attente</p>
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-3 text-sm"
            >
              <span>{inv.email}</span>
              <StatusBadge status="pending" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Courriel à inviter"
          className="max-w-sm"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          type="email"
          disabled={requiresDatabase || loading}
        />
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as Role)}
          disabled={requiresDatabase || loading}
        >
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="MANAGER">MANAGER</option>
          <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
        </select>
        <Button onClick={sendInvite} disabled={requiresDatabase || loading}>
          {loading ? "Envoi…" : "Send invite"}
        </Button>
      </div>
    </div>
  );
}
