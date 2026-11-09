/*
  MonCash — montant HTG entier et transaction unique.
  Projet KlirlineCore whybbqeeqpkbkatnkjjc, storefront KlirMarket uniquement.

  - moncash_amount_htg : montant entier envoyé à CreatePayment
  - payment_currency : HTG (NULL = commande historique, traitée comme HTG)
  - index unique sur moncash_transaction_id pour refuser la même transaction
    Digicel sur deux commandes

  N'applique pas de RLS nouvelle, ne touche pas search_products_by_image
  (SECURITY INVOKER), ne publie aucun produit.

  À appliquer AVANT de déployer moncash-payment. Cette PR ne l'applique pas.
*/

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS moncash_amount_htg integer,
  ADD COLUMN IF NOT EXISTS payment_currency text;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_currency_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_currency_check
  CHECK (payment_currency IS NULL OR payment_currency = 'HTG');

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_moncash_amount_htg_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_moncash_amount_htg_check
  CHECK (moncash_amount_htg IS NULL OR moncash_amount_htg > 0);

CREATE UNIQUE INDEX IF NOT EXISTS orders_moncash_transaction_id_uidx
  ON public.orders (moncash_transaction_id)
  WHERE moncash_transaction_id IS NOT NULL;
