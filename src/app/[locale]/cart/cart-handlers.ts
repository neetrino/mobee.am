import { apiClient } from '../../../lib/api-client';
import { logger } from '../../../lib/utils/logger';
import { showToast } from '@/components/Toast';
import type { Cart, CartItem } from './types';
import { removeGuestCartItem, updateGuestCartItemQuantity } from '../../../lib/cart/guest-cart';
import { dispatchCartUpdated } from '../../../lib/cart/dispatch-cart-updated';
import { patchLoggedInCartCache } from './cart-cache';

/**
 * Calculate cart totals
 */
function calculateCartTotals(items: CartItem[], existingTotals: Cart['totals']): Cart['totals'] {
  const newSubtotal = items.reduce((sum, item) => sum + item.total, 0);
  return {
    ...existingTotals,
    subtotal: newSubtotal,
    total: newSubtotal + existingTotals.tax + existingTotals.shipping - existingTotals.discount,
  };
}

/**
 * Remove item from guest cart in localStorage
 */
function removeFromGuestCart(itemId: string): void {
  if (typeof window === 'undefined') return;
  const variantId = getVariantIdFromCartItemId(itemId);
  if (!variantId) return;
  removeGuestCartItem(variantId, { emitEvent: false });
}

/**
 * Update item quantity in guest cart in localStorage
 */
function updateGuestCartQuantity(itemId: string, quantity: number): void {
  if (typeof window === 'undefined') return;
  const variantId = getVariantIdFromCartItemId(itemId);
  if (!variantId) return;
  updateGuestCartItemQuantity(variantId, quantity, { emitEvent: false });
}

function getVariantIdFromCartItemId(itemId: string): string | null {
  const parts = itemId.split('-');
  if (parts.length < 2) {
    return null;
  }
  return parts.slice(1, -1).join('-');
}

function publishOptimisticCart(nextCart: Cart, setCart: (cart: Cart | null) => void): void {
  setCart(nextCart);
  patchLoggedInCartCache(nextCart);
  dispatchCartUpdated({
    itemsCount: nextCart.itemsCount,
    total: nextCart.totals.total,
    keepPageCache: true,
  });
}

/**
 * Handle remove item from cart
 */
export async function handleRemoveItem(
  itemId: string,
  cart: Cart,
  isLoggedIn: boolean,
  setCart: (cart: Cart | null) => void,
  fetchCart: () => Promise<void>
): Promise<void> {
  const itemToRemove = cart.items.find(item => item.id === itemId);
  if (!itemToRemove) return;

  const updatedItems = cart.items.filter(item => item.id !== itemId);
  const newItemsCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
  const nextCart: Cart = {
    ...cart,
    items: updatedItems,
    totals: calculateCartTotals(updatedItems, cart.totals),
    itemsCount: newItemsCount,
  };

  publishOptimisticCart(nextCart, setCart);

  try {
    if (!isLoggedIn) {
      removeFromGuestCart(itemId);
      return;
    }

    await apiClient.delete(`/api/v1/cart/items/${itemId}`);
  } catch (error: unknown) {
    logger.error('Error removing item', { error, itemId });
    await fetchCart();
    dispatchCartUpdated();
  }
}

/**
 * Handle update item quantity in cart
 */
export async function handleUpdateQuantity(
  itemId: string,
  quantity: number,
  cart: Cart | null,
  isLoggedIn: boolean,
  setCart: (cart: Cart | null) => void,
  setUpdatingItems: (fn: (prev: Set<string>) => Set<string>) => void,
  fetchCart: () => Promise<void>,
  t: (key: string) => string
): Promise<void> {
  if (quantity < 1) {
    if (cart) {
      await handleRemoveItem(itemId, cart, isLoggedIn, setCart, fetchCart);
    }
    return;
  }

  const cartItem = cart?.items.find(item => item.id === itemId);
  if (!cartItem) return;

  if (cartItem.variant.stock !== undefined) {
    if (quantity > cartItem.variant.stock) {
      showToast(
        `Մատչելի քանակը ${cartItem.variant.stock} հատ է: Դուք չեք կարող ավելացնել ավելի շատ քանակ:`,
        'warning',
      );
      return;
    }
  }

  if (cart) {
    const updatedItems = cart.items.map(item =>
      item.id === itemId
        ? { ...item, quantity, total: item.price * quantity }
        : item
    );
    const newItemsCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

    publishOptimisticCart(
      {
        ...cart,
        items: updatedItems,
        totals: calculateCartTotals(updatedItems, cart.totals),
        itemsCount: newItemsCount,
      },
      setCart,
    );
  }

  setUpdatingItems(prev => new Set(prev).add(itemId));

  try {
    if (!isLoggedIn) {
      if (typeof window === 'undefined') return;

      if (cartItem.variant.stock !== undefined && quantity > cartItem.variant.stock) {
        showToast(
          `Մատչելի քանակը ${cartItem.variant.stock} հատ է: Դուք չեք կարող ավելացնել ավելի շատ քանակ:`,
          'warning',
        );
        await fetchCart();
        dispatchCartUpdated();
        setUpdatingItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        return;
      }

      updateGuestCartQuantity(itemId, quantity);
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      return;
    }

    await apiClient.patch(
      `/api/v1/cart/items/${itemId}`,
      { quantity }
    );
  } catch (error: unknown) {
    const errorObj = error as { detail?: string; message?: string };
    logger.error('Error updating quantity', { error, itemId });
    await fetchCart();
    dispatchCartUpdated();

    const errorMessage = errorObj?.detail || errorObj?.message || t('common.messages.failedToUpdateQuantity');
    if (errorMessage.includes('stock') || errorMessage.includes('exceeds')) {
      showToast(t('common.alerts.stockInsufficient').replace('{message}', errorMessage), 'warning');
    } else {
      showToast(errorMessage, 'error');
    }
  } finally {
    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }
}
