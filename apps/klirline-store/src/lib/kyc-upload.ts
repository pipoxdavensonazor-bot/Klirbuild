import { supabase } from './supabase';

const KYC_BUCKET = 'vendor-kyc';
const DELIVERY_BUCKET = 'delivery-proofs';
const PRODUCT_BUCKET = 'product-images';
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;
const MAX_BYTES = 5 * 1024 * 1024;

export type KycDocType = 'id-front' | 'id-back' | 'selfie' | 'mairie';

type UploadBucket = typeof KYC_BUCKET | typeof DELIVERY_BUCKET | typeof PRODUCT_BUCKET;

/** Stored value: storage path inside bucket (or legacy http URL). */
export function isStoragePath(value: string): boolean {
  return Boolean(value) && !/^https?:\/\//i.test(value);
}

async function signedUrl(bucket: UploadBucket, pathOrUrl: string): Promise<string | null> {
  if (!isStoragePath(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(pathOrUrl, 60 * 60);
  if (error || !data?.signedUrl) {
    console.error('Signed URL failed', error);
    return null;
  }
  return data.signedUrl;
}

export async function resolveKycUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  return signedUrl(KYC_BUCKET, pathOrUrl);
}

export async function resolveDeliveryUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (!isStoragePath(pathOrUrl)) return pathOrUrl;
  const url = await signedUrl(DELIVERY_BUCKET, pathOrUrl);
  if (url) return url;
  return signedUrl(KYC_BUCKET, pathOrUrl);
}

/** Public product image URL (http or storage path in product-images). */
export function resolveProductImageUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (!isStoragePath(pathOrUrl)) return pathOrUrl;
  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(pathOrUrl);
  return data.publicUrl || null;
}

async function compressImage(file: File): Promise<Blob> {
  if (file.type === 'application/pdf') return file;
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  return blob ?? file;
}

async function uploadToBucket(
  bucket: UploadBucket,
  folderDocType: string,
  file: File,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Vous devez être connecté pour envoyer des documents.');

  if (file.size > MAX_BYTES * 2) {
    throw new Error('Fichier trop volumineux (max ~5 Mo après compression).');
  }

  const compressed = await compressImage(file);
  if (compressed.size > MAX_BYTES) {
    throw new Error('Fichier trop volumineux après compression (max 5 Mo).');
  }

  const ext = compressed.type === 'application/pdf' ? 'pdf'
    : compressed.type === 'image/png' ? 'png'
    : compressed.type === 'image/webp' ? 'webp'
    : 'jpg';

  const path = `${user.id}/${folderDocType}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, compressed, {
      cacheControl: '3600',
      upsert: false,
      contentType: compressed.type || file.type,
    });

  if (error) {
    if (/bucket|not found|row-level security/i.test(error.message)) {
      throw new Error(
        `Stockage non configuré (${bucket}). Appliquez les migrations Phase A/B sur Supabase.`,
      );
    }
    throw new Error(error.message);
  }

  return path;
}

export async function uploadKycDocument(docType: KycDocType, file: File): Promise<string> {
  return uploadToBucket(KYC_BUCKET, docType, file);
}

export async function uploadDeliveryProof(file: File): Promise<string> {
  return uploadToBucket(DELIVERY_BUCKET, 'delivery', file);
}

export async function uploadDeliverySignature(file: File): Promise<string> {
  return uploadToBucket(DELIVERY_BUCKET, 'signature', file);
}

/** Upload product photo → returns public HTTPS URL for catalog. */
export async function uploadProductImage(file: File, slot = 0): Promise<string> {
  const path = await uploadToBucket(PRODUCT_BUCKET, `photo-${slot}`, file);
  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('URL publique introuvable après upload.');
  return data.publicUrl;
}
