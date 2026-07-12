"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { DocumentDto } from "@/lib/documents/document-service";

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentsPageClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [folderName, setFolderName] = useState("Général");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/documents"), { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de charger les documents.");
        return;
      }
      setDocuments(data.documents ?? []);
      setStorageBytes(data.storageBytes ?? 0);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onUpload(file: File) {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folderName", folderName);
      const res = await fetch(apiUrl("/api/documents"), {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload échoué.");
        return;
      }
      setMessage(`« ${data.document?.name ?? file.name} » enregistré.`);
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setUploading(false);
    }
  }

  const folders = Array.from(new Set(documents.map((d) => d.folder)));

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Dossiers et fichiers entreprise — stockage Netlify Blobs + Postgres."
        actions={
          <>
            <Input
              className="w-40"
              placeholder="Dossier"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Envoi…" : "Upload fichier"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
                e.target.value = "";
              }}
            />
          </>
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Fichiers" value={String(documents.length)} />
        <StatCard label="Dossiers" value={String(folders.length)} />
        <StatCard label="Stockage" value={formatBytes(storageBytes)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Dossier</th>
              <th className="px-4 py-3">Taille</th>
              <th className="px-4 py-3">Mis à jour</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun document. Cliquez sur Upload pour ajouter un fichier.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{doc.name}</td>
                  <td className="px-4 py-3">{doc.folder}</td>
                  <td className="px-4 py-3">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-4 py-3">{formatDate(doc.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <StatusBadge key={tag} status={tag} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        Ouvrir
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
