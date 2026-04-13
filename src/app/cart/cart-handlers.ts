import { apiClient } from '../../lib/api-client';
import { logger } from '../../lib/utils/logger';
import type { Cart, CartItem } from './types';
import { CART_KEY } from './constants';

/**
 * Guest cart item
 */
interface GuestCartItem {
  productId: string;
  productSlug?: string;
  variantId: string;
  quantity: number;
}

/**
 * Parse item ID to extract productId and variantId
 */
function parseItemId(itemId: string): { productId: string; variantId: string } | null {
  // itemId format: `${productId}-${variantId}-${index}`
  const parts = itemId.split('-');
  if (parts.length >= 2) {
    const productId = parts[0];
    const variantId = parts.slice(1, -1).join('-'); // variantId-ն կարող է պարունակել '-'
    return { productId, variantId };
  }
  return null;
}

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

  const parsed = parseItemId(itemId);
  if (!parsed) return;

  const stored = localStorage.getItem(CART_KEY);
  const guestCart: GuestCartItem[] = stored ? JSON.parse(stored) : [];
  
  const updatedCart = guestCart.filter(
    item => !(item.productId === parsed.productId && item.variantId === parsed.variantId)
  );
  
  localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
  window.dispatchEvent(new Event('cart-updated'));
}

/**
 * Update item quantity in guest cart in localStorage
 */
function updateGuestCartQuantity(itemId: string, quantity: number): void {
  if (typeof window === 'undefined') return;

  const parsed = parseItemId(itemId);
  if (!parsed) return;

  const stored = localStorage.getItem(CART_KEY);
  const guestCart: GuestCartItem[] = stored ? JSON.parse(stored) : [];
  
  const item = guestCart.find(
    item => item.productId === parsed.productId && item.variantId === parsed.variantId
  );
  
  if (item) {
    item.quantity = quantity;
    localStorage.setItem(CART_KEY, JSON.stringify(guestCart));
    window.dispatchEvent(new Event('cart-updated'));
  }
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

  // Calculate new totals
  const updatedItems = cart.items.filter(item => item.id !== itemId);
  const newItemsCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

  // Update UI immediately (optimistic update)
  setCart({
    ...cart,
    items: updatedItems,
    totals: calculateCartTotals(updatedItems, cart.totals),
    itemsCount: newItemsCount,
  });

  try {
    if (!isLoggedIn) {
      removeFromGuestCart(itemId);
      return;
    }

    // For logged-in users, delete from API
    await apiClient.delete(`/api/v1/cart/items/${itemId}`);
    window.dispatchEvent(new Event('cart-updated'));
  } catch (error: unknown) {
    logger.error('Error removing item', { error, itemId });
    // Revert optimistic update on error
    await fetchCart();
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

  // Find the cart item to check stock
  const cartItem = cart?.items.find(item => item.id === itemId);
  if (!cartItem) return;

  if (cartItem.variant.stock !== undefined) {
    if (quantity > cartItem.variant.stock) {
      alert(`Մատչելի քանակը ${cartItem.variant.stock} հատ է: Դուք չեք կարող ավելացնել ավելի շատ քանակ:`);
      return;
    }
  }

  // Optimistic update: update UI immediately
  if (cart) {
    const updatedItems = cart.items.map(item => 
      item.id === itemId 
        ? { ...item, quantity, total: item.price * quantity }
        : item
    );
    const newItemsCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

    setCart({
      ...cart,
      items: updatedItems,
      totals: calculateCartTotals(updatedItems, cart.totals),
      itemsCount: newItemsCount,
    });
  }

  setUpdatingItems(prev => new Set(prev).add(itemId));

  try {
    if (!isLoggedIn) {
      if (typeof window === 'undefined') return;

      // Check stock for guest cart
      if (cartItem.variant.stock !== undefined && quantity > cartItem.variant.stock) {
        alert(`Մատչելի քանակը ${cartItem.variant.stock} հատ է: Դուք չեք կարող ավելացնել ավելի շատ քանակ:`);
        // Revert optimistic update
        await fetchCart();
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

    // For logged-in users, update via API
    await apiClient.patch(
      `/api/v1/cart/items/${itemId}`,
      { quantity }
    );

    window.dispatchEvent(new Event('cart-updated'));
  } catch (error: unknown) {
    const errorObj = error as { detail?: string; message?: string };
    logger.error('Error updating quantity', { error, itemId });
    // Revert optimistic update on error
    await fetchCart();
    
    // Show user-friendly error message
    const errorMessage = errorObj?.detail || errorObj?.message || t('common.messages.failedToUpdateQuantity');
    if (errorMessage.includes('stock') || errorMessage.includes('exceeds')) {
      alert(t('common.alerts.stockInsufficient').replace('{message}', errorMessage));
    } else {
      alert(errorMessage);
    }
  } finally {
    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }
}




