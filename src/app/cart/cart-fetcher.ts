import { apiClient } from '../../lib/api-client';
import { logger } from '../../lib/utils/logger';
import {
  buildGuestCartFromStoredSnapshots,
  fetchGuestCartHydrated,
} from '../../lib/cart/guest-cart';
import type { Cart } from './types';
import { readLoggedInCartCache, writeLoggedInCartCache } from './cart-cache';

/**
 * Instant cart from local/session storage (no network).
 */
export function readInstantCart(isLoggedIn: boolean, userId?: string): Cart | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isLoggedIn) {
    return buildGuestCartFromStoredSnapshots();
  }

  return readLoggedInCartCache(userId);
}

/**
 * Fetch guest cart — uses local snapshots when complete, otherwise hydrates from API.
 */
export async function fetchGuestCartFresh(): Promise<Cart | null> {
  const instant = buildGuestCartFromStoredSnapshots();
  if (instant) {
    return instant;
  }

  try {
    return await fetchGuestCartHydrated(() => 'Product');
  } catch (error: unknown) {
    logger.error('Error loading guest cart', { error });
    return null;
  }
}

/**
 * Fetch logged-in user cart from API.
 */
export async function fetchLoggedInCartFresh(userId?: string): Promise<Cart | null> {
  try {
    const response = await apiClient.get<{ cart: Cart }>('/api/v1/cart');
    if (userId) {
      writeLoggedInCartCache(userId, response.cart);
    }
    return response.cart;
  } catch (error: unknown) {
    logger.error('Error fetching cart', { error });
    return readLoggedInCartCache(userId) ?? null;
  }
}

/**
 * Fetch fresh cart data from the server.
 */
export async function fetchCartFresh(
  isLoggedIn: boolean,
  userId?: string,
): Promise<Cart | null> {
  if (!isLoggedIn) {
    return fetchGuestCartFresh();
  }
  return fetchLoggedInCartFresh(userId);
}

/** @deprecated Use readInstantCart + fetchCartFresh instead. */
export async function fetchCart(
  isLoggedIn: boolean,
  _t: (key: string) => string,
  userId?: string,
): Promise<Cart | null> {
  const instant = readInstantCart(isLoggedIn, userId);
  if (instant) {
    return instant;
  }
  return fetchCartFresh(isLoggedIn, userId);
}
