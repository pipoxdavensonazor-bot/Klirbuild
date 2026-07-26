
/*
# Seller Dashboard: RLS updates and RPC functions

## Summary
Adds seller visibility to orders/order_items and creates RPC functions
for the seller dashboard stats and recent sales.

## Changes

### Helper function
- `is_seller_for_order(order_uuid uuid)`: SECURITY DEFINER function that
  returns true when the calling user is a seller for at least one product
  in the given order. Breaks the circular RLS dependency between orders
  and order_items.

### Modified tables
- `orders` SELECT policy updated: sellers can now see orders that contain
  their products (in addition to buyers who placed the order).
- `order_items` SELECT policy updated: sellers can see order items for
  products they own (in addition to buyers).

### New RPC functions
- `get_seller_stats()`: returns JSON with total_products, total_orders,
  total_revenue, pending_orders for the calling seller.
- `get_seller_recent_sales()`: returns a table of recent order items
  for the calling seller, including order status, product info, and
  line totals.

## Security
- All helper functions use SECURITY DEFINER with explicit search_path = ''
  to prevent search path injection.
- RLS policies reference auth.uid() which reads from the JWT even inside
  SECURITY DEFINER context.
*/

-- ─── Helper: is the calling user a seller for a given order? ─────────────────
CREATE OR REPLACE FUNCTION public.is_seller_for_order(order_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = order_uuid
      AND p.seller_id = auth.uid()
  );
$$;

-- ─── orders: update SELECT policy to include seller visibility ────────────────
DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
CREATE POLICY "select_own_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_seller_for_order(id)
  );

-- ─── order_items: replace SELECT policy ──────────────────────────────────────
DROP POLICY IF EXISTS "select_own_order_items" ON public.order_items;
CREATE POLICY "select_own_order_items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.seller_id = auth.uid()
    )
  );

-- ─── RPC: seller stats ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_seller_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT json_build_object(
    'total_products', (
      SELECT COUNT(*) FROM public.products
      WHERE seller_id = auth.uid()
    ),
    'total_orders', (
      SELECT COUNT(DISTINCT oi.order_id)
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE p.seller_id = auth.uid()
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0)
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.orders o ON o.id = oi.order_id
      WHERE p.seller_id = auth.uid()
        AND o.status = 'completed'
    ),
    'pending_orders', (
      SELECT COUNT(DISTINCT oi.order_id)
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.orders o ON o.id = oi.order_id
      WHERE p.seller_id = auth.uid()
        AND o.status = 'pending'
    )
  );
$$;

-- ─── RPC: seller recent sales ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_seller_recent_sales(limit_count int DEFAULT 20)
RETURNS TABLE (
  order_item_id  uuid,
  order_id       uuid,
  order_status   text,
  order_date     timestamptz,
  product_id     uuid,
  product_name   text,
  product_image  text,
  quantity       int,
  unit_price     numeric,
  line_total     numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    oi.id            AS order_item_id,
    oi.order_id,
    o.status::text   AS order_status,
    o.created_at     AS order_date,
    p.id             AS product_id,
    p.name           AS product_name,
    p.image_url      AS product_image,
    oi.quantity,
    oi.price         AS unit_price,
    (oi.price * oi.quantity) AS line_total
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  JOIN public.orders o ON o.id = oi.order_id
  WHERE p.seller_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT limit_count;
$$;
