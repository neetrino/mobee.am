import { apiClient } from '../../lib/api-client';
import { logger } from '../../lib/utils/logger';
import type { Cart } from './types';
import { fetchGuestCartHydrated } from '../../lib/cart/guest-cart';

/**
 * Fetch guest cart
 */
export async function fetchGuestCart(t: (key: string) => string): Promise<Cart | null> {
  try {
    return await fetchGuestCartHydrated(t);
  } catch (error: unknown) {
    logger.error('Error loading guest cart', { error });
    return null;
  }
}

/**
 * Fetch logged-in user cart
 */
export async function fetchLoggedInCart(): Promise<Cart | null> {
  try {
    const response = await apiClient.get<{ cart: Cart }>('/api/v1/cart');
    return response.cart;
  } catch (error: unknown) {
    logger.error('Error fetching cart', { error });
    return null;
  }
}

/**
 * Fetch cart (guest or logged-in)
 */
export async function fetchCart(
  isLoggedIn: boolean,
  t: (key: string) => string
): Promise<Cart | null> {
  if (!isLoggedIn) {
    return fetchGuestCart(t);
  }
  return fetchLoggedInCart();
}




