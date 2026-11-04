/*
# Versement vendeur MonCash — version schema_migrations whybbqeeqpkbkatnkjjc

Horodatage de production : 20260727032336 (pas le placeholder README 20260727070000).
Idempotent. Ne pas ré-appliquer si cette version est déjà dans schema_migrations.

seller-payout écrit le transfert sur order_fulfillments et lit le portefeuille
sur vendor_applications (payout_method, payout_wallet) — pas sur profiles.
payout_ready_at existe déjà (20260726200000_phase_b_escrow_fulfillment.sql).
*/

ALTER TABLE public.order_fulfillments
  ADD COLUMN IF NOT EXISTS payout_provider text,
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_transaction_id text,
  ADD COLUMN IF NOT EXISTS payout_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_error text;

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_wallet text;

ALTER TABLE public.vendor_applications
  DROP CONSTRAINT IF EXISTS vendor_applications_payout_method_check;

ALTER TABLE public.vendor_applications
  ADD CONSTRAINT vendor_applications_payout_method_check
  CHECK (
    payout_method IS NULL
    OR payout_method IN ('moncash', 'natcash')
  );

CREATE OR REPLACE FUNCTION public.seller_get_payout_wallet()
RETURNS TABLE (
  payout_method text,
  payout_wallet text,
  business_phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.payout_method, v.payout_wallet, v.business_phone
  FROM public.vendor_applications v
  WHERE v.user_id = auth.uid()
  ORDER BY (v.status = 'approved') DESC, v.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.seller_update_payout_wallet(
  p_method text,
  p_wallet text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet text;
  v_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_method IS NULL OR p_method NOT IN ('moncash', 'natcash') THEN
    RAISE EXCEPTION 'Méthode de versement invalide';
  END IF;

  v_wallet := regexp_replace(COALESCE(p_wallet, ''), '\D', '', 'g');
  IF v_wallet ~ '^\d{8}$' THEN
    v_wallet := '509' || v_wallet;
  END IF;
  IF v_wallet !~ '^509\d{8}$' THEN
    RAISE EXCEPTION 'Numéro MonCash invalide (attendu 509XXXXXXXX).';
  END IF;

  UPDATE public.vendor_applications AS vendor
  SET payout_method = p_method,
      payout_wallet = v_wallet,
      updated_at = now()
  WHERE vendor.id = (
    SELECT application.id
    FROM public.vendor_applications AS application
    WHERE application.user_id = auth.uid()
      AND application.status = 'approved'
    ORDER BY application.created_at DESC
    LIMIT 1
  );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Aucun dossier vendeur approuvé';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.seller_get_payout_wallet() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_get_payout_wallet() TO authenticated;

REVOKE ALL ON FUNCTION public.seller_update_payout_wallet(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_update_payout_wallet(text, text) TO authenticated;
