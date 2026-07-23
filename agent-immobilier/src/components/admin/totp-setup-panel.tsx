"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = { enabled: boolean; configured: boolean };

export function TotpSetupPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/totp");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setup() {
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/admin/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
    });
    setPending(false);
    if (!res.ok) {
      setMessage("Impossible de générer le secret.");
      return;
    }
    const data = await res.json();
    setSecret(data.secret);
    setOtpauth(data.otpauth);
    setMessage("Scannez le secret dans Google Authenticator / Authy, puis validez un code.");
  }

  async function enable() {
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/admin/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable", totp: code }),
    });
    setPending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Activation impossible.");
      return;
    }
    setSecret(null);
    setOtpauth(null);
    setCode("");
    setMessage("2FA activée.");
    refresh();
  }

  async function disable() {
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/admin/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable", totp: code }),
    });
    setPending(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Désactivation impossible.");
      return;
    }
    setCode("");
    setMessage("2FA désactivée.");
    refresh();
  }

  return (
    <div className="space-y-4 border border-slate-200 bg-white p-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#0F172A]">
          Double authentification (2FA)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Optionnel — mot de passe + code temporaire (Google Authenticator, Authy…).
          Un seul compte admin.
        </p>
        <p className="mt-2 text-sm text-[#0F172A]">
          État :{" "}
          <strong>{status?.enabled ? "Activée" : "Désactivée"}</strong>
        </p>
      </div>

      {!status?.enabled ? (
        <div className="space-y-3">
          <Button type="button" variant="gold" disabled={pending} onClick={setup}>
            {pending ? "…" : "Générer un secret 2FA"}
          </Button>
          {secret ? (
            <div className="space-y-2 text-sm">
              <p>
                Secret (saisie manuelle) :{" "}
                <code className="break-all rounded bg-slate-100 px-1">{secret}</code>
              </p>
              {otpauth ? (
                <p className="break-all text-xs text-slate-500">
                  URI : {otpauth}
                </p>
              ) : null}
              <div>
                <Label htmlFor="totp-enable">Code à 6 chiffres</Label>
                <Input
                  id="totp-enable"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
              <Button type="button" variant="outline" disabled={pending} onClick={enable}>
                Activer la 2FA
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="totp-disable">Code actuel pour désactiver</Label>
            <Input
              id="totp-disable"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              inputMode="numeric"
            />
          </div>
          <Button type="button" variant="outline" disabled={pending} onClick={disable}>
            Désactiver la 2FA
          </Button>
        </div>
      )}
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
