"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  name: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
};

/** Compress large images in the browser before upload (max edge ~1600px). */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (file.size < 900_000) return file;

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

export function ImageUploadField({
  name,
  label = "Photo",
  defaultValue = "",
  required = false,
}: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue);
  const [driveUrl, setDriveUrl] = useState("");
  const [pending, setPending] = useState<"file" | "drive" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setPending("file");
    setError(null);
    setMessage(null);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Échec du téléversement.");
        return;
      }
      setUrl(data.url);
      setMessage("Photo téléversée depuis l'ordinateur.");
    } catch {
      setError("Impossible de lire ou compresser le fichier.");
    } finally {
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function importDrive() {
    if (!driveUrl.trim()) {
      setError("Collez un lien Google Drive.");
      return;
    }
    setPending("drive");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/upload/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Import Drive impossible.");
        return;
      }
      setUrl(data.url);
      setMessage("Photo importée depuis Google Drive.");
      setDriveUrl("");
    } catch {
      setError("Erreur réseau lors de l'import Drive.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3 rounded-sm border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={inputId}>{label}</Label>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#C9A227] hover:underline"
          >
            Voir l&apos;image
          </a>
        ) : null}
      </div>

      <input type="hidden" name={name} value={url} required={required} />

      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Aperçu"
          className="h-36 w-full max-w-sm object-cover bg-slate-200"
        />
      ) : (
        <div className="flex h-28 max-w-sm items-center justify-center border border-dashed border-slate-300 bg-white text-xs text-slate-400">
          Aucune photo sélectionnée
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => fileRef.current?.click()}
        >
          {pending === "file" ? "Téléversement…" : "Depuis l'ordinateur"}
        </Button>
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-3">
        <p className="text-xs font-medium text-slate-600">Depuis Google Drive</p>
        <p className="text-xs text-slate-400">
          Sur Drive : Partager → « Toute personne disposant du lien », puis collez
          le lien ici.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/…/view"
            className="bg-white"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => void importDrive()}
            className="shrink-0"
          >
            {pending === "drive" ? "Import…" : "Importer Drive"}
          </Button>
        </div>
      </div>

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
