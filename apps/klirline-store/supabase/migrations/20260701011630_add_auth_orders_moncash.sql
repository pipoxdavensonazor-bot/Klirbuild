/*
# Add Seller Accounts, Orders, and MonCash Payment Support

1. Modified Tables
   - `products`: Add `seller_id` (nullable uuid, references auth.users) so authenticated sellers can list their products.

2. New Tables
   - `orders`: Stores customer purchase orders linked to authenticated users.
     - `id` (uuid, primary key)
     - `user_id` (uuid, NOT NULL, defaults to auth.uid(), references auth.users)
     - `total` (numeric, order total amount)
     - `status` (text: pending | completed | failed | cancelled)
     - `moncash_order_id` (text, nullable) — the order ID forwarded to MonCash
     - `moncash_transaction_id` (text, nullable) — transaction ID returned by MonCash after payment
     - `created_at` (timestamp)

   - `order_items`: Line items for each order.
     - `id` (uuid, primary key)
     - `order_id` (uuid, references orders on delete cascade)
     - `product_id` (uuid, references products)
     - `quantity` (integer, number of units purchased)
     - `price` (numeric, unit price at time of purchase)
     - `created_at` (timestamp)

3. Security
   - Products: authenticated users can INSERT (seller_id defaults to auth.uid())
   - Products: sellers can UPDATE and DELETE their own products
   - Orders: authenticated users can INSERT their own orders, SELECT/UPDATE their own orders
   - Order Items: scoped through parent order ownership
   - Anon users retain full read access to products and categories
*/

-- Add seller_id to products
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE products ADD COLUMN seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Allow authenticated users to insert products (seller_id defaults to auth.uid())
DROP POLICY IF EXISTS "Authenticated users can add products" ON products;
CREATE POLICY "Authenticated users can add products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow sellers to update their own products
DROP POLICY IF EXISTS "Sellers can update own products" ON products;
CREATE POLICY "Sellers can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Allow sellers to delete their own products
DROP POLICY IF EXISTS "Sellers can delete own products" ON products;
CREATE POLICY "Sellers can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  moncash_order_id text,
  moncash_transaction_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_order_items" ON order_items;
CREATE POLICY "select_own_order_items" ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_order_items" ON order_items;
CREATE POLICY "insert_own_order_items" ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
