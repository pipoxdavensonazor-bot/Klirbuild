import { NextResponse } from "next/server";
import { enrichSession, getRequestSession, requireSession } from "@/lib/auth/auth-service";
import {
  getDocumentsStorageBytes,
  listDocuments,
  uploadDocument,
  upsertDocument,
} from "@/lib/documents/document-service";

export const runtime = "nodejs";

async function companyId() {
  const session = await getRequestSession();
  if (!session) return null;
  return (await enrichSession(session)).companyId;
}

export async function GET() {
  const cid = await companyId();
  if (!cid) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const [documents, storageBytes] = await Promise.all([
    listDocuments(cid),
    getDocumentsStorageBytes(cid),
  ]);
  return NextResponse.json({ documents, storageBytes });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis." }, { status: 400 });
    }
    const folderName =
      typeof form?.get("folderName") === "string"
        ? (form.get("folderName") as string)
        : undefined;
    const tagsRaw = form?.get("tags");
    const tags =
      typeof tagsRaw === "string"
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined;

    const result = await uploadDocument(session.companyId, { file, folderName, tags });
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const body = await request.json().catch(() => ({}));
  const result = await upsertDocument(session.companyId, {
    id: typeof body.id === "string" ? body.id : undefined,
    name: typeof body.name === "string" ? body.name : "",
    folderName: typeof body.folderName === "string" ? body.folderName : undefined,
    type: typeof body.type === "string" ? body.type : undefined,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : undefined,
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
