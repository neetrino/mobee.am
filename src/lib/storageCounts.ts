'use client';

import { readCompareEntries, SHOP_COMPARE_STORAGE_KEY } from './shop/compare-storage';
import { readWishlistProductIds, WISHLIST_STORAGE_KEY } from './wishlist/wishlist-storage';

/**
 * Shared storage keys used to keep wishlist, compare and cart data in localStorage.
 */
export const STORAGE_KEYS = {
  wishlist: WISHLIST_STORAGE_KEY,
  compare: SHOP_COMPARE_STORAGE_KEY,
  cart: 'shop_cart_guest',
} as const;

export const WISHLIST_KEY = STORAGE_KEYS.wishlist;
export const COMPARE_KEY = STORAGE_KEYS.compare;
export const CART_KEY = STORAGE_KEYS.cart;

/**
 * Retrieves wishlist items count from localStorage.
 */
export function getWishlistCount(): number {
  return readWishlistProductIds().length;
}

/**
 * Retrieves compare items count from localStorage.
 */
export function getCompareCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return readCompareEntries().length;
  } catch {
    return 0;
  }
}

/**
 * Guest cart total quantity (sum of line quantities), for nav badges.
 */
export function getGuestCartItemsCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = window.localStorage.getItem(CART_KEY);
    if (!stored) return 0;
    const guestCart = JSON.parse(stored) as unknown;
    if (!Array.isArray(guestCart)) return 0;
    return guestCart.reduce((sum: number, item: { quantity?: number }) => {
      const q = item?.quantity;
      return sum + (typeof q === 'number' && !Number.isNaN(q) ? q : 0);
    }, 0);
  } catch {
    return 0;
  }
}

