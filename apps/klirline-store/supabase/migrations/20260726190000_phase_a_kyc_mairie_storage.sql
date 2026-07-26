/*
# Phase A — KYC Haïti (ID + preuve Mairie + Storage)

## Changes
- `address_proof_url` — attestation / certificat de résidence de la Mairie (obligatoire)
- Checklist admin: ID valide, selfie correspond, preuve Mairie OK
- Bucket Storage privé `vendor-kyc` + politiques RLS
*/

-- ── 1. Colonnes KYC Mairie + checklist admin ────────────────────────────────
ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS address_proof_url text;

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS checklist_id_ok boolean NOT NULL DEFAULT false;

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS checklist_selfie_ok boolean NOT NULL DEFAULT false;

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS checklist_mairie_ok boolean NOT NULL DEFAULT false;

-- Rendre address_proof obligatoire pour les nouvelles candidatures (après backfill)
-- Les anciennes lignes sans preuve restent valides; le front exige le champ à l'insert.
UPDATE public.vendor_applications
SET address_proof_url = COALESCE(address_proof_url, id_front_url)
WHERE address_proof_url IS NULL;

ALTER TABLE public.vendor_applications
  ALTER COLUMN address_proof_url SET NOT NULL;

-- ── 2. Bucket Storage vendor-kyc ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-kyc',
  'vendor-kyc',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = false;

-- Path convention: {auth.uid()}/{docType}-{timestamp}.{ext}

DROP POLICY IF EXISTS "vendor_kyc_upload_own" ON storage.objects;
CREATE POLICY "vendor_kyc_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "vendor_kyc_update_own" ON storage.objects;
CREATE POLICY "vendor_kyc_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vendor-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'vendor-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "vendor_kyc_select_own" ON storage.objects;
CREATE POLICY "vendor_kyc_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-kyc'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "vendor_kyc_delete_own" ON storage.objects;
CREATE POLICY "vendor_kyc_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vendor-kyc'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
