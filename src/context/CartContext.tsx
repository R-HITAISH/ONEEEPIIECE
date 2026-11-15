import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type CartLock, type Item, LOCK_DURATION_MS } from '@/lib/supabase';
import { getSessionId } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

type CartItem = { lock: CartLock; item: Item; guest: boolean };
type CartContextValue = {
  cartItems: CartItem[];
  loading: boolean;
  itemCount: number;
  addToCart: (itemId: string) => Promise<{ success: boolean; error: string | null }>;
  removeFromCart: (lockId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => Promise<void>;
};

const GUEST_CART_KEY = 'oneeepiiece_guest_cart_v1';
const CartContext = createContext<CartContextValue | undefined>(undefined);

function readGuestIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function guestLock(itemId: string): CartLock {
  return {
    id: `guest-${itemId}`,
    item_id: itemId,
    session_id: getSessionId(),
    status: 'active',
    locked_at: new Date().toISOString(),
    expires_at: '2099-12-31T23:59:59.000Z',
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    if (authLoading) return;
    if (user) {
      const { data: locks, error } = await supabase
        .from('cart_locks').select('*, item:item_id(*)').eq('user_id', user.id).eq('status', 'active')
        .order('locked_at', { ascending: false });
      if (!error && locks) {
        setCartItems(locks.filter((row) => row.item && row.item.status !== 'sold')
          .map((row) => ({ lock: row, item: row.item as Item, guest: false })));
      }
      setLoading(false);
      return;
    }

    const ids = readGuestIds();
    if (ids.length === 0) {
      setCartItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('items').select('*').in('id', ids).eq('status', 'available');
    if (!error) {
      const byId = new Map((data ?? []).map((item) => [item.id, item]));
      setCartItems(ids.flatMap((id) => {
        const item = byId.get(id);
        return item ? [{ lock: guestLock(id), item, guest: true }] : [];
      }));
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    let active = true;
    const loadAndMerge = async () => {
      if (authLoading) return;
      setLoading(true);
      if (user) {
        const guestIds = readGuestIds();
        const keepForRetry: string[] = [];
        for (const itemId of guestIds) {
          const { error } = await supabase.from('cart_locks').insert({
            item_id: itemId,
            user_id: user.id,
            session_id: getSessionId(),
            status: 'active',
            locked_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + LOCK_DURATION_MS).toISOString(),
          });
          if (error && error.code !== '23505') keepForRetry.push(itemId);
        }
        if (keepForRetry.length) localStorage.setItem(GUEST_CART_KEY, JSON.stringify(keepForRetry));
        else localStorage.removeItem(GUEST_CART_KEY);
      }
      if (active) await refreshCart();
    };
    void loadAndMerge();
    return () => { active = false; };
  }, [authLoading, user, refreshCart]);

  useEffect(() => {
    const interval = window.setInterval(() => { void refreshCart(); }, 30000);
    return () => window.clearInterval(interval);
  }, [refreshCart]);

  const addToCart = useCallback(async (itemId: string) => {
    if (user) {
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
      const { error } = await supabase.from('cart_locks').insert({
        item_id: itemId,
        user_id: user.id,
        session_id: getSessionId(),
        status: 'active',
        locked_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
      if (error) return { success: false, error: error.code === '23505' ? 'This piece is already reserved by another shopper' : error.message };
      await refreshCart();
      return { success: true, error: null };
    }

    const { data: item, error } = await supabase.from('items').select('id,status,stock').eq('id', itemId).maybeSingle();
    if (error || !item) return { success: false, error: 'Could not check availability. Please try again.' };
    if (item.status !== 'available' || item.stock < 1) return { success: false, error: 'This piece is no longer available.' };
    const ids = readGuestIds();
    if (!ids.includes(itemId)) localStorage.setItem(GUEST_CART_KEY, JSON.stringify([...ids, itemId]));
    await refreshCart();
    return { success: true, error: null };
  }, [refreshCart, user]);

  const removeFromCart = useCallback(async (lockId: string) => {
    if (lockId.startsWith('guest-')) {
      const itemId = lockId.slice('guest-'.length);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(readGuestIds().filter((id) => id !== itemId)));
    } else {
      await supabase.from('cart_locks').update({ status: 'released' }).eq('id', lockId).eq('user_id', user?.id ?? '');
    }
    await refreshCart();
  }, [refreshCart, user]);

  const clearCart = useCallback(async () => {
    if (user) {
      await supabase.from('cart_locks').update({ status: 'released' }).eq('user_id', user.id).eq('status', 'active');
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
    }
    await refreshCart();
  }, [refreshCart, user]);

  return <CartContext.Provider value={{ cartItems, loading, itemCount: cartItems.length, addToCart, removeFromCart, refreshCart, clearCart }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
