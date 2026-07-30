/**
 * Upload / serve hardening: never trust client Content-Type alone.
 * Sniff magic bytes when possible, force nosniff + safe disposition on serve.
 */

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Types safe to display inline in the browser. */
const INLINE_SAFE = new Set([
  ...IMAGE_TYPES,
  "application/pdf",
]);

/** Never serve these with an executable / document MIME — force download. */
const DANGEROUS_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/xml",
  "application/xml",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/jscript",
  "application/ecmascript",
]);

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function extensionFromKey(key: string): string {
  const base = key.split("/").pop() ?? key;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function sniffContentType(
  bytes: ArrayBuffer | Uint8Array
): string | null {
  const view =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.length < 12) return null;

  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    view[0] === 0x47 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x38
  ) {
    return "image/gif";
  }
  // RIFF....WEBP
  if (
    view[0] === 0x52 &&
    view[1] === 0x49 &&
    view[2] === 0x46 &&
    view[3] === 0x46 &&
    view[8] === 0x57 &&
    view[9] === 0x45 &&
    view[10] === 0x42 &&
    view[11] === 0x50
  ) {
    return "image/webp";
  }
  // %PDF
  if (
    view[0] === 0x25 &&
    view[1] === 0x50 &&
    view[2] === 0x44 &&
    view[3] === 0x46
  ) {
    return "application/pdf";
  }
  // PK (zip / office)
  if (view[0] === 0x50 && view[1] === 0x4b) {
    return "application/zip";
  }
  return null;
}

export function normalizeUploadContentType(input: {
  declaredType?: string | null;
  key: string;
  bytes?: ArrayBuffer | Uint8Array | null;
  allowed?: Set<string> | ((type: string) => boolean);
}): { ok: true; contentType: string } | { ok: false; error: string } {
  const declared = (input.declaredType || "").split(";")[0]?.trim().toLowerCase() ?? "";
  const sniffed = input.bytes ? sniffContentType(input.bytes) : null;
  const fromExt = EXT_MIME[extensionFromKey(input.key)] ?? "";

  let contentType = sniffed || declared || fromExt || "application/octet-stream";

  if (DANGEROUS_TYPES.has(contentType)) {
    return { ok: false, error: "Type de fichier interdit." };
  }

  // If we sniffed an image/pdf, prefer sniff over a mismatched client claim.
  if (sniffed && declared && sniffed !== declared) {
    // Allow jpeg/jpg alias mismatch only
    const aliasOk =
      (sniffed === "image/jpeg" && declared === "image/jpg") ||
      (sniffed === "application/zip" &&
        (declared.includes("officedocument") ||
          declared === "application/msword" ||
          declared === "application/vnd.ms-excel" ||
          declared === "application/zip"));
    if (!aliasOk && IMAGE_TYPES.has(sniffed)) {
      contentType = sniffed;
    } else if (!aliasOk && sniffed === "application/pdf") {
      contentType = sniffed;
    }
  }

  if (input.allowed) {
    const ok =
      typeof input.allowed === "function"
        ? input.allowed(contentType)
        : input.allowed.has(contentType);
    if (!ok) {
      return { ok: false, error: "Format de fichier non accepté." };
    }
  }

  return { ok: true, contentType };
}

export function resolveServeHeaders(input: {
  storedContentType?: string | null;
  key: string;
  bytes?: ArrayBuffer | Uint8Array | null;
}): {
  contentType: string;
  contentDisposition: string;
  headers: Record<string, string>;
} {
  const sniffed = input.bytes ? sniffContentType(input.bytes) : null;
  const stored = (input.storedContentType || "")
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  const fromExt = EXT_MIME[extensionFromKey(input.key)] ?? "";

  let contentType =
    sniffed ||
    (stored && !DANGEROUS_TYPES.has(stored) ? stored : "") ||
    fromExt ||
    "application/octet-stream";

  if (DANGEROUS_TYPES.has(contentType)) {
    contentType = "application/octet-stream";
  }

  const filename = (input.key.split("/").pop() || "file").replace(
    /[^\w.\-() ]+/g,
    "_"
  );
  const inline = INLINE_SAFE.has(contentType);
  const contentDisposition = inline
    ? `inline; filename="${filename}"`
    : `attachment; filename="${filename}"`;

  return {
    contentType,
    contentDisposition,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
      "Cross-Origin-Resource-Policy": "same-site",
    },
  };
}

export const MARKETING_UPLOAD_TYPES = IMAGE_TYPES;
