import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getDisplayPrice, type Product, type CartItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GUEST_CART_KEY = 'klirline_guest_cart_v1';

type GuestLine = { product_id: string; quantity: number };

function readGuestLines(): GuestLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuestLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(l => l && typeof l.product_id === 'string' && l.quantity > 0)
      .map(l => ({ product_id: l.product_id, quantity: Math.max(1, Math.floor(Number(l.quantity) || 1)) }));
  } catch {
    return [];
  }
}

function writeGuestLines(lines: GuestLine[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
}

function clearGuestLines() {
  localStorage.removeItem(GUEST_CART_KEY);
}

function guestItemId(productId: string) {
  return `guest:${productId}`;
}

function hydrateGuestCart(lines: GuestLine[], catalog: Product[]): (CartItem & { product: Product })[] {
  const byId = new Map(catalog.map(p => [p.id, p]));
  return lines
    .map(line => {
      const product = byId.get(line.product_id);
      if (!product) return null;
      return {
        id: guestItemId(line.product_id),
        session_id: 'guest',
        product_id: line.product_id,
        quantity: line.quantity,
        created_at: new Date().toISOString(),
        product,
      } satisfies CartItem & { product: Product };
    })
    .filter(Boolean) as (CartItem & { product: Product })[];
}

/**
 * Cart for signed-in users (Supabase) and guests (localStorage).
 * Pass `catalog` so guest lines can resolve product snapshots.
 */
export const useCart = (catalog: Product[] = []) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<(CartItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const mergingRef = useRef(false);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  const loadGuestCart = useCallback(() => {
    const lines = readGuestLines();
    setCartItems(hydrateGuestCart(lines, catalogRef.current));
    setLoading(false);
  }, []);

  const fetchServerCart = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('session_id', user.id);

    if (!error && data) {
      setCartItems(data as (CartItem & { product: Product })[]);
    }
    setLoading(false);
  }, [user]);

  const mergeGuestIntoServer = useCallback(async () => {
    if (!user || mergingRef.current) return;
    const guest = readGuestLines();
    if (guest.length === 0) {
      await fetchServerCart();
      return;
    }
    mergingRef.current = true;
    try {
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity')
        .eq('session_id', user.id);

      const byProduct = new Map((existing ?? []).map(r => [r.product_id, r]));

      for (const line of guest) {
        const row = byProduct.get(line.product_id);
        if (row) {
          await supabase
            .from('cart_items')
            .update({ quantity: row.quantity + line.quantity })
            .eq('id', row.id);
        } else {
          await supabase.from('cart_items').insert({
            session_id: user.id,
            product_id: line.product_id,
            quantity: line.quantity,
          });
        }
      }
      clearGuestLines();
      await fetchServerCart();
    } finally {
      mergingRef.current = false;
    }
  }, [user, fetchServerCart]);

  useEffect(() => {
    if (user) {
      void mergeGuestIntoServer();
    } else {
      loadGuestCart();
    }
  }, [user?.id, mergeGuestIntoServer, loadGuestCart]);

  // Re-hydrate guest cart when catalog arrives / updates
  useEffect(() => {
    if (!user) loadGuestCart();
  }, [catalog, user, loadGuestCart]);

  const addToCart = async (product: Product, quantity = 1) => {
    const qty = Math.max(1, Math.floor(quantity));

    if (!user) {
      const lines = readGuestLines();
      const idx = lines.findIndex(l => l.product_id === product.id);
      if (idx >= 0) {
        lines[idx] = { ...lines[idx], quantity: lines[idx].quantity + qty };
      } else {
        lines.push({ product_id: product.id, quantity: qty });
      }
      writeGuestLines(lines);
      const catalog =
        catalogRef.current.find(p => p.id === product.id)
          ? catalogRef.current
          : [product, ...catalogRef.current];
      setCartItems(hydrateGuestCart(lines, catalog));
      return;
    }

    const existingItem = cartItems.find(item => item.product_id === product.id);

    if (existingItem) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + qty })
        .eq('id', existingItem.id);
      if (!error) await fetchServerCart();
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          session_id: user.id,
          product_id: product.id,
          quantity: qty,
        });
      if (!error) await fetchServerCart();
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    if (!user || itemId.startsWith('guest:')) {
      const productId = itemId.startsWith('guest:') ? itemId.slice(6) : itemId;
      const lines = readGuestLines().map(l =>
        l.product_id === productId ? { ...l, quantity } : l,
      );
      writeGuestLines(lines);
      setCartItems(hydrateGuestCart(lines, catalogRef.current));
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);
    if (!error) await fetchServerCart();
  };

  const removeFromCart = async (itemId: string) => {
    if (!user || itemId.startsWith('guest:')) {
      const productId = itemId.startsWith('guest:') ? itemId.slice(6) : itemId;
      const lines = readGuestLines().filter(l => l.product_id !== productId);
      writeGuestLines(lines);
      setCartItems(hydrateGuestCart(lines, catalogRef.current));
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    if (!error) await fetchServerCart();
  };

  const cartTotal = cartItems.reduce((total, item) => {
    if (!item.product) return total;
    return total + getDisplayPrice(item.product) * item.quantity;
  }, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return {
    cartItems,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    cartTotal,
    cartCount,
    refreshCart: user ? fetchServerCart : loadGuestCart,
  };
};
