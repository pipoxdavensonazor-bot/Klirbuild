/*
# Phase C — zones livraison + frais shipping sur orders
*/
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_fee numeric NOT NULL DEFAULT 0;
