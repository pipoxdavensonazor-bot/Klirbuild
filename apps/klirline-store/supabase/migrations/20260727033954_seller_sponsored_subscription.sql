/*
# Abonnement Sponsored — table — version schema_migrations whybbqeeqpkbkatnkjjc

Horodatage de production : 20260727033954 (pas le placeholder README 20260727080000).
Idempotent. Ne pas ré-appliquer si cette version est déjà dans schema_migrations.

Colonnes alignées sur le schéma live seller_sponsorships, y compris
admin_followup_by. Le boost catalogue est products.sponsored (pas une colonne
profiles). Les fonctions (activate, lectures admin/vendeur) sont dans
20260727034139_seller_sponsored_functions.sql.

Les écritures passent par la service role / les RPC SECURITY DEFINER.
*/

CREATE TABLE IF NOT EXISTS public.seller_sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'monthly_sponsor',
  status text NOT NULL DEFAULT 'pending',
  amount_htg numeric NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  starts_at timestamptz,
  ends_at timestamptz,
  priority_support boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  stripe_session_id text,
  stripe_payment_intent_id text,
  stripe_amount_usd_cents integer,
  admin_followup_status text NOT NULL DEFAULT 'pending',
  admin_followup_note text,
  admin_followup_at timestamptz,
  admin_followup_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.seller_sponsorships
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'monthly_sponsor',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS amount_htg numeric,
  ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority_support boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_amount_usd_cents integer,
  ADD COLUMN IF NOT EXISTS admin_followup_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_followup_note text,
  ADD COLUMN IF NOT EXISTS admin_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_followup_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.seller_sponsorships
  DROP CONSTRAINT IF EXISTS seller_sponsorships_status_check;

ALTER TABLE public.seller_sponsorships
  ADD CONSTRAINT seller_sponsorships_status_check
  CHECK (status IN ('pending', 'active', 'expired'));

ALTER TABLE public.seller_sponsorships
  DROP CONSTRAINT IF EXISTS seller_sponsorships_admin_followup_status_check;

ALTER TABLE public.seller_sponsorships
  ADD CONSTRAINT seller_sponsorships_admin_followup_status_check
  CHECK (admin_followup_status IN ('pending', 'contacted', 'done'));

CREATE INDEX IF NOT EXISTS idx_seller_sponsorships_seller_status
  ON public.seller_sponsorships (seller_id, status);

CREATE INDEX IF NOT EXISTS idx_seller_sponsorships_stripe_session
  ON public.seller_sponsorships (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sponsored boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_sponsored
  ON public.products (sponsored)
  WHERE sponsored;

ALTER TABLE public.seller_sponsorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_select_own_sponsorships" ON public.seller_sponsorships;
CREATE POLICY "seller_select_own_sponsorships"
  ON public.seller_sponsorships
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.seller_sponsorships FROM anon, authenticated;
