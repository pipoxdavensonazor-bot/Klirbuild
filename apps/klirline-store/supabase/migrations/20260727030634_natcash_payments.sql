/*
# NatCash — version schema_migrations whybbqeeqpkbkatnkjjc

Horodatage de production : 20260727030634 (pas le placeholder README 20260727060000).
Idempotent. Ne pas ré-appliquer si cette version est déjà dans schema_migrations.

natcash-payment écrit natcash_order_id et natcash_transaction_id, et pose
payment_method = 'natcash' (contrainte posée par la migration Stripe).
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS natcash_order_id text,
  ADD COLUMN IF NOT EXISTS natcash_transaction_id text;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('moncash', 'stripe', 'natcash')
  );

CREATE INDEX IF NOT EXISTS idx_orders_natcash_order_id
  ON public.orders (natcash_order_id)
  WHERE natcash_order_id IS NOT NULL;
