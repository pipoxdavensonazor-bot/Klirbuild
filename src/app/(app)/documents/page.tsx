import { PageHeader, StatCard } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { documents } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const folders = Array.from(new Set(documents.map((d) => d.folder)));

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Folders, upload UI, preview and version stubs."
        actions={
          <>
            <Button variant="outline">New folder</Button>
            <Button>Upload</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Files" value={String(documents.length)} />
        <StatCard label="Folders" value={String(folders.length)} />
        <StatCard label="Storage used" value="3.7 GB" hint="of 50 GB" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {folders.map((folder) => (
          <Button key={folder} size="sm" variant="outline">
            {folder}
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/50">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Folder</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Tags</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{doc.name}</td>
                <td className="px-4 py-3">{doc.folder}</td>
                <td className="px-4 py-3 uppercase">{doc.type}</td>
                <td className="px-4 py-3">{doc.size}</td>
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

      <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Drag & drop upload zone · storage abstraction ready for local / S3 / Blob
      </div>
    </div>
  );
}
