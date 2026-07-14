"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl, parseApiResponse } from "@/lib/api-client";

export function SettingsSecurityPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  async function load2fa() {
    try {
      const res = await fetch(apiUrl("/api/auth/2fa"), { credentials: "include" });
      const data = await parseApiResponse(res);
      if (res.ok) setTotpEnabled(Boolean(data.totpEnabled));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void load2fa();
  }, []);

  async function changePassword() {
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Échec du changement.");
        return;
      }
      setMessage("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function start2fa() {
    setError("");
    setMessage("");
    setTotpLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/2fa"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Échec setup 2FA");
        return;
      }
      setTotpSecret(typeof data.secret === "string" ? data.secret : "");
      setTotpUri(typeof data.uri === "string" ? data.uri : "");
      setMessage("Scannez ou copiez le secret, puis validez un code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setTotpLoading(false);
    }
  }

  async function enable2fa() {
    setError("");
    setMessage("");
    setTotpLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/2fa"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", code: totpCode }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Code invalide");
        return;
      }
      setTotpEnabled(true);
      setTotpSecret("");
      setTotpUri("");
      setTotpCode("");
      setMessage("Authentification à deux facteurs activée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setTotpLoading(false);
    }
  }

  async function disable2fa() {
    setError("");
    setMessage("");
    setTotpLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/2fa"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disable",
          password: disablePassword,
          code: disableCode,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Échec désactivation");
        return;
      }
      setTotpEnabled(false);
      setDisablePassword("");
      setDisableCode("");
      setMessage("2FA désactivée.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setTotpLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium">Changer le mot de passe</p>
        <p className="text-xs text-muted-foreground">
          Requiert DATABASE_URL et un compte avec mot de passe enregistré.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <div className="grid max-w-md gap-3">
        <Input
          type="password"
          placeholder="Mot de passe actuel"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={loading}
        />
        <Input
          type="password"
          placeholder="Nouveau mot de passe (8+)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
        />
        <Input
          type="password"
          placeholder="Confirmer le nouveau mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
        <Button onClick={() => void changePassword()} disabled={loading}>
          {loading ? "Enregistrement…" : "Mettre à jour le mot de passe"}
        </Button>
      </div>

      <div className="max-w-lg space-y-3 border-t border-border pt-4">
        <div>
          <p className="text-sm font-medium">Authentification à deux facteurs (TOTP)</p>
          <p className="text-xs text-muted-foreground">
            Statut : {totpEnabled ? "activée" : "désactivée"}. Compatible Google
            Authenticator, Authy, 1Password, etc.
          </p>
        </div>

        {!totpEnabled && !totpSecret ? (
          <Button
            variant="outline"
            onClick={() => void start2fa()}
            disabled={totpLoading}
          >
            {totpLoading ? "Génération…" : "Configurer la 2FA"}
          </Button>
        ) : null}

        {totpSecret ? (
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Secret (copiez dans votre appli si le QR n’est pas disponible) :
            </p>
            <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
              {totpSecret}
            </code>
            {totpUri ? (
              <a
                href={totpUri}
                className="text-xs text-primary underline"
              >
                Ouvrir le lien otpauth://
              </a>
            ) : null}
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Code à 6 chiffres pour activer"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
            />
            <Button onClick={() => void enable2fa()} disabled={totpLoading}>
              Activer la 2FA
            </Button>
          </div>
        ) : null}

        {totpEnabled ? (
          <div className="grid max-w-md gap-2">
            <Input
              type="password"
              placeholder="Mot de passe pour désactiver"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Code 2FA actuel"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
            />
            <Button
              variant="destructive"
              onClick={() => void disable2fa()}
              disabled={totpLoading}
            >
              Désactiver la 2FA
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
