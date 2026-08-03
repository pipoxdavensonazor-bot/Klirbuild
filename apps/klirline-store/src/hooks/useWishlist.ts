import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type Product } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GUEST_WISHLIST_KEY = 'klirline_guest_wishlist_v1';

function readGuestIds(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeGuestIds(ids: string[]) {
  localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify([...new Set(ids)]));
}

function clearGuestIds() {
  localStorage.removeItem(GUEST_WISHLIST_KEY);
}

/**
 * Wishlist for signed-in users (Supabase) and guests (localStorage).
 * Merges guest → server on login.
 */
export function useWishlist(catalog: Product[] = []) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const mergingRef = useRef(false);
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;

  const loadGuest = useCallback(() => {
    setIds(new Set(readGuestIds()));
  }, []);

  const fetchServer = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('wishlists').select('product_id');
    if (data) setIds(new Set(data.map(w => w.product_id)));
  }, [user]);

  const mergeGuestIntoServer = useCallback(async () => {
    if (!user || mergingRef.current) return;
    const guest = readGuestIds();
    if (guest.length === 0) {
      await fetchServer();
      return;
    }
    mergingRef.current = true;
    try {
      const { data: existing } = await supabase.from('wishlists').select('product_id');
      const have = new Set((existing ?? []).map(r => r.product_id));
      const toInsert = guest.filter(id => !have.has(id)).map(product_id => ({ product_id }));
      if (toInsert.length) {
        await supabase.from('wishlists').insert(toInsert);
      }
      clearGuestIds();
      await fetchServer();
    } finally {
      mergingRef.current = false;
    }
  }, [user, fetchServer]);

  useEffect(() => {
    if (user) void mergeGuestIntoServer();
    else loadGuest();
  }, [user?.id, mergeGuestIntoServer, loadGuest]);

  const toggle = async (product: Product) => {
    const productId = product.id;
    const has = ids.has(productId);

    if (!user) {
      const next = readGuestIds();
      const updated = has ? next.filter(id => id !== productId) : [...next, productId];
      writeGuestIds(updated);
      setIds(new Set(updated));
      return;
    }

    if (has) {
      await supabase.from('wishlists').delete().eq('product_id', productId);
      setIds(prev => {
        const n = new Set(prev);
        n.delete(productId);
        return n;
      });
    } else {
      await supabase.from('wishlists').insert({ product_id: productId });
      setIds(prev => new Set(prev).add(productId));
    }
  };

  const remove = async (productId: string) => {
    if (!user) {
      const updated = readGuestIds().filter(id => id !== productId);
      writeGuestIds(updated);
      setIds(new Set(updated));
      return;
    }
    await supabase.from('wishlists').delete().eq('product_id', productId);
    setIds(prev => {
      const n = new Set(prev);
      n.delete(productId);
      return n;
    });
  };

  const clear = async () => {
    if (!user) {
      clearGuestIds();
      setIds(new Set());
      return;
    }
    await supabase.from('wishlists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setIds(new Set());
  };

  const items: Product[] = [...ids]
    .map(id => catalogRef.current.find(p => p.id === id))
    .filter(Boolean) as Product[];

  return {
    wishlistIds: ids,
    wishlistItems: items,
    toggleWishlist: toggle,
    removeFromWishlist: remove,
    clearWishlist: clear,
    refreshWishlist: user ? fetchServer : loadGuest,
  };
}
