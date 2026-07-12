"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { DocumentDto } from "@/lib/documents/document-service";

export function DocumentsPageClient() {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(apiUrl("/api/documents"), { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDocuments(d.documents ?? []))
      .finally(() => setLoading(false));
  }, []);

  const folders = Array.from(new Set(documents.map((d) => d.folder)));

  if (loading) return <p className="p-8 text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Dossiers et fichiers entreprise (base de données)."
        actions={<Button variant="outline">Upload (bientôt)</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Fichiers" value={String(documents.length)} />
        <StatCard label="Dossiers" value={String(folders.length)} />
        <StatCard label="Stockage" value="—" hint="Blobs à venir" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Dossier</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Mis à jour</th>
              <th className="px-4 py-3">Tags</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{doc.name}</td>
                <td className="px-4 py-3">{doc.folder}</td>
                <td className="px-4 py-3">{doc.type}</td>
                <td className="px-4 py-3">{formatDate(doc.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((tag) => (
                      <StatusBadge key={tag} status={tag} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
