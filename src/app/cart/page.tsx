'use client';

import { useState, useEffect, useRef } from 'react';
import { getStoredCurrency } from '../../lib/currency';
import { useTranslation } from '../../lib/i18n-client';
import { useAuth } from '../../lib/auth/AuthContext';
import type { Cart } from './types';
import { fetchCart } from './cart-fetcher';
import { handleRemoveItem, handleUpdateQuantity } from './cart-handlers';
import { CartTable, OrderSummary } from './cart-components';
import { EmptyCart } from './empty-cart';
import { LoadingState } from './loading-state';

export default function CartPage() {
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  // Track if we updated locally to prevent unnecessary re-fetch
  const isLocalUpdateRef = useRef(false);

  useEffect(() => {
    loadCart();

    const handleCurrencyUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    const handleCartUpdate = () => {
      // If we just updated locally, skip re-fetch to avoid page reload
      if (isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false;
        return;
      }
      
      // Only re-fetch if update came from external source (another component)
      loadCart();
    };

    const handleAuthUpdate = () => {
      loadCart();
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('auth-updated', handleAuthUpdate);

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('auth-updated', handleAuthUpdate);
    };
  }, [isLoggedIn, t]);

  async function loadCart() {
    try {
      setLoading(true);
      const cartData = await fetchCart(isLoggedIn, t);
      setCart(cartData);
    } catch (error: unknown) {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }

  async function onRemoveItem(itemId: string) {
    if (!cart) return;
    
    // Mark as local update to prevent re-fetch in event handler
    isLocalUpdateRef.current = true;
    
    await handleRemoveItem(itemId, cart, isLoggedIn, setCart, loadCart);
  }

  async function onUpdateQuantity(itemId: string, quantity: number) {
    // Mark as local update to prevent re-fetch in event handler
    isLocalUpdateRef.current = true;
    
    await handleUpdateQuantity(
      itemId,
      quantity,
      cart,
      isLoggedIn,
      setCart,
      setUpdatingItems,
      loadCart,
      t
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyCart t={t} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('common.cart.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <CartTable
          cart={cart}
          currency={currency}
          updatingItems={updatingItems}
          onRemove={onRemoveItem}
          onUpdateQuantity={onUpdateQuantity}
          t={t}
        />
        <OrderSummary cart={cart} currency={currency} t={t} />
      </div>
    </div>
  );
}
