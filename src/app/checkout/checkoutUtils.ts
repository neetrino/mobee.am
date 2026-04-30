import type { Cart, CartItem } from './types';
import { clearGuestCart as clearSharedGuestCart, fetchGuestCartHydrated } from '../../lib/cart/guest-cart';

export async function fetchCartForGuest(): Promise<Cart | null> {
  const hydrated = await fetchGuestCartHydrated(() => 'Product');
  if (!hydrated) {
    return null;
  }

  const checkoutItems: CartItem[] = hydrated.items.map((item) => ({
    id: item.id,
    variant: {
      id: item.variant.id,
      sku: item.variant.sku,
      product: item.variant.product,
    },
    quantity: item.quantity,
    price: item.price,
    total: item.total,
  }));

  return {
    id: hydrated.id,
    items: checkoutItems,
    totals: hydrated.totals,
    itemsCount: hydrated.itemsCount,
  };
}

export function clearGuestCart(): void {
  clearSharedGuestCart();
}



