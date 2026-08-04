/**
 * Broadcast cart changes to Header / bottom nav, and keep cart-page session cache coherent.
 */

import { clearLoggedInCartCache } from '@/app/cart/cart-cache';

export type CartUpdatedDetail = {
  itemsCount?: number;
  total?: number;
  optimisticAdd?: {
    quantity?: number;
    price?: number;
  };
  /**
   * When true, leave cart page session snapshot alone (caller already patched it).
   * Default clears the snapshot so refresh never flashes stale lines after add/remove elsewhere.
   */
  keepPageCache?: boolean;
};

/**
 * Notify listeners about cart changes. Clears logged-in cart page cache unless keepPageCache.
 */
export function dispatchCartUpdated(detail?: CartUpdatedDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!detail?.keepPageCache) {
    clearLoggedInCartCache();
  }

  if (detail) {
    const { keepPageCache: _keep, ...publicDetail } = detail;
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: publicDetail }));
    return;
  }

  window.dispatchEvent(new Event('cart-updated'));
}
