import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../lib/api-client';
import { useTranslation } from '../../../lib/i18n-client';
import { fetchCartForGuest } from '../checkoutUtils';
import type { Cart } from '../types';

export function useCart(isLoggedIn: boolean) {
  const { t } = useTranslation();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isLoggedIn) {
        const response = await apiClient.get<{ cart: Cart }>('/api/v1/cart');
        setCart(response.cart);
        return;
      }

      const guestCart = await fetchCartForGuest();
      setCart(guestCart);
    } catch {
      setError(t('checkout.errors.failedToLoadCart'));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, t]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return { cart, loading, error, setError, fetchCart };
}

