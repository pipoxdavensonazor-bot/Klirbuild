/*
# Stripe (carte + Link) — version schema_migrations whybbqeeqpkbkatnkjjc

Horodatage de production : 20260727023604 (pas le placeholder README 20260727050000).
Le fichier est idempotent. Ne pas le ré-enregistrer si cette version est déjà
dans schema_migrations.

Colonnes MonCash (moncash_order_id, moncash_transaction_id) : déjà créées par
20260701011630_add_auth_orders_moncash.sql — non dupliquées ici.

Ajouts requis par stripe-checkout, checkout-create et l’e-mail de confirmation,
absents des migrations antérieures du dépôt :
- payment_method (moncash | stripe | natcash)
- identifiants Stripe
- confirmation_email_sent_at
- guest_email / guest_token, user_id nullable (commande invité)
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_amount_usd_cents integer,
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_token text;

ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('moncash', 'stripe', 'natcash')
  );

UPDATE public.orders
SET payment_method = 'moncash'
WHERE payment_method IS NULL
  AND (moncash_order_id IS NOT NULL OR moncash_transaction_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id
  ON public.orders (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
