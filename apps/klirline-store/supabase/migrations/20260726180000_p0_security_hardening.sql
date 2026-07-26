/*
  # P0 Security Hardening

  1. Protect profiles.is_admin from self-escalation (trigger)
  2. Remove buyer UPDATE on orders (status only via service role / edge)
  3. Require approved vendor KYC for product INSERT
  4. Helper is_approved_vendor()
*/

-- ─── 1. Protect is_admin ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    -- service role / SQL editor: auth.uid() is null → allowed
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'permission denied: cannot modify is_admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_is_admin ON public.profiles;
CREATE TRIGGER trg_protect_is_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_admin();

REVOKE EXECUTE ON FUNCTION public.protect_is_admin() FROM anon, authenticated;

-- ─── 2. Orders: no authenticated UPDATE (edge uses service role) ─────────────

DROP POLICY IF EXISTS "update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "cancel_own_pending_orders" ON public.orders;
-- Intentionally no UPDATE policy for authenticated/anon.
-- Completing payment is done by moncash-payment edge with service role.

-- ─── 3. Approved vendor helper + product INSERT ──────────────────────────────

CREATE OR REPLACE FUNCTION public.is_approved_vendor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendor_applications
    WHERE user_id = auth.uid()
      AND status = 'approved'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_approved_vendor() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_approved_vendor() TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can add products" ON public.products;
DROP POLICY IF EXISTS "Approved vendors can add products" ON public.products;
CREATE POLICY "Approved vendors can add products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND public.is_approved_vendor()
  );
