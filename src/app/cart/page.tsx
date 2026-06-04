'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getStoredCurrency } from '../../lib/currency';
import { useTranslation } from '../../lib/i18n-client';
import { useAuth } from '../../lib/auth/AuthContext';
import type { Cart } from './types';
import { fetchCartFresh, readInstantCart } from './cart-fetcher';
import { writeLoggedInCartCache } from './cart-cache';
import { handleRemoveItem, handleUpdateQuantity } from './cart-handlers';
import { CartTable, OrderSummary } from './cart-components';
import { EmptyCart } from './empty-cart';
import { LoadingState } from './loading-state';
import { SITE_CONTENT_GUTTERS_CLASS } from '../../components/header-strip-layout';
import { EMPTY_CART_ILLUSTRATION_SRC } from '../../lib/empty-state/empty-state-images.constants';
import { usePreloadEmptyStateImage } from '../../lib/empty-state/usePreloadEmptyStateImage';

export default function CartPage() {
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const { t } = useTranslation();
  const userId = user?.id;

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const isLocalUpdateRef = useRef(false);
  const hasCartRef = useRef(false);
  const cartRef = useRef<Cart | null>(null);

  const showEmptyPreload = authLoading || !cart || cart.items.length === 0;
  usePreloadEmptyStateImage(showEmptyPreload ? EMPTY_CART_ILLUSTRATION_SRC : '');

  useEffect(() => {
    hasCartRef.current = cart !== null;
    cartRef.current = cart;
  }, [cart]);

  const refreshCart = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true && hasCartRef.current;

    try {
      if (!silent) {
        setLoading(true);
      }

      const freshCart = await fetchCartFresh(isLoggedIn, userId);
      if (freshCart) {
        setCart(freshCart);
        if (isLoggedIn && userId) {
          writeLoggedInCartCache(userId, freshCart);
        }
        return;
      }

      if (!silent) {
        setCart(null);
      }
    } catch {
      if (!silent) {
        setCart(null);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;
    const instantCart = readInstantCart(isLoggedIn, userId);

    if (instantCart) {
      setCart(instantCart);
      setLoading(false);
    }

    void (async () => {
      if (!isLoggedIn && instantCart) {
        return;
      }

      const needsBlockingLoad = instantCart === null;
      if (needsBlockingLoad && !cancelled) {
        setLoading(true);
      }

      try {
        const freshCart = await fetchCartFresh(isLoggedIn, userId);
        if (cancelled) {
          return;
        }

        if (freshCart) {
          setCart(freshCart);
          if (isLoggedIn && userId) {
            writeLoggedInCartCache(userId, freshCart);
          }
        } else if (needsBlockingLoad) {
          setCart(null);
        }
      } catch {
        if (!cancelled && needsBlockingLoad) {
          setCart(null);
        }
      } finally {
        if (!cancelled && needsBlockingLoad) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn, userId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const handleCurrencyUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    const handleCartUpdate = () => {
      if (isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false;
        return;
      }
      void refreshCart({ silent: hasCartRef.current });
    };

    const handleAuthUpdate = () => {
      void refreshCart();
    };

    window.addEventListener('currency-updated', handleCurrencyUpdate);
    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('auth-updated', handleAuthUpdate);

    return () => {
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('auth-updated', handleAuthUpdate);
    };
  }, [authLoading, refreshCart]);

  const onRemoveItem = useCallback(async (itemId: string) => {
    const currentCart = cartRef.current;
    if (!currentCart) {
      return;
    }

    isLocalUpdateRef.current = true;
    await handleRemoveItem(
      itemId,
      currentCart,
      isLoggedIn,
      setCart,
      () => refreshCart({ silent: true }),
    );
  }, [isLoggedIn, refreshCart]);

  const onUpdateQuantity = useCallback(async (itemId: string, quantity: number) => {
    isLocalUpdateRef.current = true;

    await handleUpdateQuantity(
      itemId,
      quantity,
      cartRef.current,
      isLoggedIn,
      setCart,
      setUpdatingItems,
      () => refreshCart({ silent: true }),
      t,
    );
  }, [isLoggedIn, refreshCart, t]);

  if (authLoading || (loading && !cart)) {
    return <LoadingState />;
  }

  if (!cart || cart.items.length === 0) {
    return <EmptyCart t={t} />;
  }

  return (
    <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-12`}>
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
