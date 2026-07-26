/*
# Admin access — litiges, commandes, clients
*/

-- Admins can see all orders
DROP POLICY IF EXISTS "admin_select_orders" ON public.orders;
CREATE POLICY "admin_select_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admins can see all order items
DROP POLICY IF EXISTS "admin_select_order_items" ON public.order_items;
CREATE POLICY "admin_select_order_items" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Admins can update fulfillments (litiges / résolution)
DROP POLICY IF EXISTS "admin_update_fulfillments" ON public.order_fulfillments;
CREATE POLICY "admin_update_fulfillments" ON public.order_fulfillments
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_set_fulfillment_status(
  p_fulfillment_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS public.order_fulfillments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f public.order_fulfillments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_status NOT IN ('paid', 'preparing', 'shipped', 'delivered', 'payout_ready', 'paid_out', 'disputed') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.order_fulfillments
  SET status = p_status,
      delivery_note = COALESCE(NULLIF(trim(p_note), ''), delivery_note),
      updated_at = now(),
      payout_ready_at = CASE WHEN p_status = 'payout_ready' THEN COALESCE(payout_ready_at, now()) ELSE payout_ready_at END,
      paid_out_at = CASE WHEN p_status = 'paid_out' THEN COALESCE(paid_out_at, now()) ELSE paid_out_at END
  WHERE id = p_fulfillment_id
  RETURNING * INTO f;

  IF NOT FOUND THEN RAISE EXCEPTION 'Fulfillment not found'; END IF;
  RETURN f;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_fulfillment_status(uuid, text, text) TO authenticated;

-- Promote first admin by email (edit the email below, run once in SQL Editor as postgres)
-- UPDATE public.profiles
-- SET is_admin = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'VOTRE_EMAIL@exemple.com');
