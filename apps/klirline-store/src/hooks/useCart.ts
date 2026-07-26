import { useState, useEffect } from 'react';
import { supabase, getDisplayPrice, type Product, type CartItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useCart = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<(CartItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('session_id', user.id);

    if (!error && data) {
      setCartItems(data as (CartItem & { product: Product })[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, [user?.id]);

  const addToCart = async (product: Product) => {
    if (!user) return;

    const existingItem = cartItems.find(item => item.product_id === product.id);

    if (existingItem) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + 1 })
        .eq('id', existingItem.id);

      if (!error) {
        await fetchCart();
      }
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          session_id: user.id,
          product_id: product.id,
          quantity: 1,
        });

      if (!error) {
        await fetchCart();
      }
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (!error) {
      await fetchCart();
    }
  };

  const removeFromCart = async (itemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      await fetchCart();
    }
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
    refreshCart: fetchCart,
  };
};
