-- Orders must be created via checkout-create, where catalog prices,
-- shipping fees, stock, and quantities are validated with the service role.
-- Direct Data API inserts would otherwise bypass those checks.

DROP POLICY IF EXISTS "insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "insert_own_order_items" ON public.order_items;

REVOKE INSERT ON TABLE public.orders FROM anon, authenticated;
REVOKE INSERT ON TABLE public.order_items FROM anon, authenticated;
