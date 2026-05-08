'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth/AuthContext';
import { getGuestCartItemsCount } from '../../lib/storageCounts';

/**
 * Cart item count for mobile bottom nav (guest localStorage + API when logged in).
 */
export function useMobileBottomNavCartCount(): number {
  const { isLoggedIn } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const loadCartCount = useCallback(async () => {
    if (!isLoggedIn) {
      setCartCount(getGuestCartItemsCount());
      return;
    }
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setCartCount(0);
        return;
      }
      const response = await apiClient.get<{ cart: { itemsCount: number } }>('/api/v1/cart');
      setCartCount(response.cart?.itemsCount ?? 0);
    } catch {
      setCartCount(0);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void loadCartCount();
  }, [loadCartCount]);

  useEffect(() => {
    const onCartUpdated = (e: Event) => {
      const detail = (e as CustomEvent<unknown>)?.detail as
        | { optimisticAdd?: { quantity?: number }; itemsCount?: number; total?: number }
        | undefined;
      const optimistic = detail?.optimisticAdd;
      if (optimistic) {
        setCartCount((c) => c + (optimistic.quantity ?? 1));
        return;
      }
      if (detail?.itemsCount !== undefined && detail?.total !== undefined) {
        setCartCount(detail.itemsCount);
        return;
      }
      void loadCartCount();
    };

    const onAuthUpdated = () => {
      void loadCartCount();
    };

    window.addEventListener('cart-updated', onCartUpdated);
    window.addEventListener('auth-updated', onAuthUpdated);
    return () => {
      window.removeEventListener('cart-updated', onCartUpdated);
      window.removeEventListener('auth-updated', onAuthUpdated);
    };
  }, [loadCartCount]);

  return cartCount;
}
