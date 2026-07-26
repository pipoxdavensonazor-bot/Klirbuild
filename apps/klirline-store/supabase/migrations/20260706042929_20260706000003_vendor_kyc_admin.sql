/*
# Vendor KYC System & Admin Panel

## Overview
Adds a KYC (Know Your Customer) verification system for vendor registration.
Users must apply and be approved by an admin before they can list products.

## Changes

### profiles table (modified)
- Added `is_admin` (boolean, default false) — marks a user as a platform admin.

### vendor_applications table (new)
Stores vendor registration requests with full KYC data.
- `id` — UUID primary key
- `user_id` — FK to auth.users, defaults to auth.uid()
- `status` — 'pending' | 'approved' | 'rejected' (default 'pending')
- `business_name` — seller's business or shop name
- `owner_name` — full legal name of the owner
- `business_category` — product category (Electronics, Fashion, etc.)
- `business_phone` — contact phone number
- `business_address` — street address
- `city` — city
- `department` — one of Haiti's 10 departments
- `id_front_url` — URL of ID card / passport front photo
- `id_back_url` — URL of ID card back photo (optional)
- `selfie_url` — URL of selfie with ID for liveness verification
- `rejection_reason` — admin's note when rejecting (optional)
- `reviewed_by` — admin user ID who reviewed this application
- `reviewed_at` — timestamp of review decision
- `created_at` / `updated_at` — timestamps

### Functions (new)
- `public.is_admin()` — SECURITY DEFINER, returns true if the current user has is_admin=true in profiles
- `public.get_vendor_status()` — returns the current user's latest vendor application status

### Security (RLS)
- `vendor_applications` has RLS enabled
- Users can SELECT and INSERT their own applications
- Admins (is_admin=true) can SELECT all applications and UPDATE status/review fields
- Multiple permissive SELECT policies are OR-combined in Postgres

### Important Notes
1. `is_admin` on profiles must be set manually via Supabase Studio or execute_sql for the first admin.
2. Only one active application per user is expected; frontend enforces this.
3. Document URLs are pasted by the user (Supabase Storage upload can replace this in production).
4. The `is_admin()` function uses SECURITY DEFINER to safely cross the RLS boundary.
*/

-- ── 1. Add is_admin to profiles ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── 2. is_admin() helper function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ── 3. vendor_applications table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendor_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL DEFAULT auth.uid()
                        REFERENCES auth.users(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
  business_name       text NOT NULL,
  owner_name          text NOT NULL,
  business_category   text NOT NULL,
  business_phone      text,
  business_address    text,
  city                text,
  department          text,
  id_front_url        text NOT NULL,
  id_back_url         text,
  selfie_url          text NOT NULL,
  rejection_reason    text,
  reviewed_by         uuid REFERENCES auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_vendor_applications_user
  ON public.vendor_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_applications_status
  ON public.vendor_applications(status);

-- ── 4. RLS on vendor_applications ───────────────────────────────────────────
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

-- Users can select their own applications
DROP POLICY IF EXISTS "select_own_vendor_apps" ON public.vendor_applications;
CREATE POLICY "select_own_vendor_apps" ON public.vendor_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can select all applications (OR-combined with above)
DROP POLICY IF EXISTS "admin_select_vendor_apps" ON public.vendor_applications;
CREATE POLICY "admin_select_vendor_apps" ON public.vendor_applications
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Users can insert their own application
DROP POLICY IF EXISTS "insert_own_vendor_app" ON public.vendor_applications;
CREATE POLICY "insert_own_vendor_app" ON public.vendor_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any application (to set status, rejection_reason, reviewed_by, etc.)
DROP POLICY IF EXISTS "admin_update_vendor_apps" ON public.vendor_applications;
CREATE POLICY "admin_update_vendor_apps" ON public.vendor_applications
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. get_vendor_status() convenience function ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_vendor_status()
RETURNS TABLE(
  status            text,
  business_name     text,
  rejection_reason  text,
  created_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT status, business_name, rejection_reason, created_at
  FROM public.vendor_applications
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
$$;
