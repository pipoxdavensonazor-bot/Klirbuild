import { NextResponse } from "next/server";
import { enrichSession, requireSession } from "@/lib/auth/auth-service";
import { isAdminDeleter } from "@/lib/admin/delete-governance-service";
import {
  createCompanyBackup,
  getBackupDownload,
  listCompanyBackups,
} from "@/lib/admin/backup-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  if (!isAdminDeleter(enriched.role)) {
    return NextResponse.json({ error: "Accès admin requis." }, { status: 403 });
  }

  const url = new URL(request.url);
  const downloadId = url.searchParams.get("download");
  if (downloadId) {
    const file = await getBackupDownload({
      companyId: enriched.companyId,
      backupId: downloadId,
      role: enriched.role,
    });
    if ("error" in file && file.error) {
      return NextResponse.json({ error: file.error }, { status: 404 });
    }
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType!,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  }

  const backups = await listCompanyBackups(enriched.companyId);
  return NextResponse.json({ backups });
}

export async function POST() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  const enriched = await enrichSession(session);

  const result = await createCompanyBackup({
    companyId: enriched.companyId,
    trigger: "manual",
    createdByEmail: enriched.email,
    role: enriched.role,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ backup: result.backup });
}
