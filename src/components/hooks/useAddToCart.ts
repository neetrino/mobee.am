'use client';

import { useRef } from 'react';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { dispatchCartFlyAnimation } from '../../lib/cart/dispatchCartFlyAnimation';
import type { CartFlyContext } from '../../lib/cart/cart-fly-animation.types';
import { readGuestCart, upsertGuestCartItem } from '../../lib/cart/guest-cart';
import { fetchProductBySlugWithLang } from '../../lib/shop/fetchProductBySlugWithLang';
import { showToast } from '../Toast';

interface ProductDetails {
  id: string;
  slug: string;
  variants?: Array<{
    id: string;
    sku: string;
    price: number;
    stock: number;
    available: boolean;
  }>;
}

type CartItemPostResponse = {
  item: { id: string; quantity: number; price: number };
  cartSummary?: { itemsCount: number; total: number };
};

interface UseAddToCartProps {
  productId: string;
  productSlug: string;
  inStock: boolean;
  /** When present, skip GET /api/v1/products/:slug and use this variant for add-to-cart (one request instead of two). */
  defaultVariantId?: string | null;
  /** Unit price (AMD) — stored in guest cart so Header doesn't need extra API calls. */
  price?: number;
}

/**
 * Add-to-cart with instant UI: optimistic header + fly animation run synchronously; network work is backgrounded.
 * `isAddingToCart` stays false so buttons never show a loading state (in-flight guarded by ref).
 */
export function useAddToCart({ productId, productSlug, inStock, defaultVariantId, price: propPrice }: UseAddToCartProps) {
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const inFlightRef = useRef(false);

  const triggerFly = (fly: CartFlyContext | undefined) => {
    if (fly?.imageUrl && fly.flySourceEl) {
      dispatchCartFlyAnimation(fly.imageUrl, fly.flySourceEl);
    }
  };

  const addToCart = (fly?: CartFlyContext) => {
    if (!inStock || inFlightRef.current) {
      return;
    }

    if (!productSlug || productSlug.trim() === '' || productSlug.includes(' ')) {
      showToast(t('common.alerts.invalidProduct'), 'warning');
      return;
    }

    const encodedSlug = encodeURIComponent(productSlug.trim());

    if (!isLoggedIn) {
      inFlightRef.current = true;
      void (async () => {
        try {
          let variantId: string;
          let variantStock: number | undefined;
          let variantPrice: number | undefined = propPrice || undefined;
          if (defaultVariantId) {
            variantId = defaultVariantId;
          } else {
            const productDetails = await fetchProductBySlugWithLang<ProductDetails>(encodedSlug);
            if (!productDetails.variants || productDetails.variants.length === 0) {
              showToast(t('common.alerts.noVariantsAvailable'), 'warning');
              return;
            }
            variantId = productDetails.variants[0].id;
            variantStock = productDetails.variants[0].stock;
            if (!variantPrice) variantPrice = productDetails.variants[0].price;
          }

          const existingGuestItem = readGuestCart().find((item) => item.variantId === variantId);
          const nextQuantity = (existingGuestItem?.quantity ?? 0) + 1;

          if (variantStock !== undefined && nextQuantity > variantStock) {
            showToast(t('common.alerts.noMoreStockAvailable'), 'warning');
            return;
          }
          upsertGuestCartItem({
            productId,
            productSlug,
            variantId,
            quantity: 1,
          });
          window.dispatchEvent(new Event('cart-updated'));
          triggerFly(fly);
        } catch (error: unknown) {
          console.error('❌ [PRODUCT CARD] Error adding to guest cart:', error);
          const err = error as { message?: string; status?: number };
          if (err?.message?.includes('does not exist') || err?.message?.includes('404') || err?.status === 404) {
            showToast(t('common.alerts.productNotFound'), 'error');
          } else {
            showToast(t('common.alerts.failedToAddToCart'), 'error');
          }
        } finally {
          inFlightRef.current = false;
        }
      })();
      return;
    }

    inFlightRef.current = true;
    const unitPrice = propPrice ?? 0;
    window.dispatchEvent(
      new CustomEvent('cart-updated', {
        detail: { optimisticAdd: { quantity: 1, price: unitPrice } },
      }),
    );
    triggerFly(fly);

    void (async () => {
      try {
        let variantId: string;
        let bodyProductId = productId;

        if (defaultVariantId) {
          variantId = defaultVariantId;
        } else {
          const productDetails = await fetchProductBySlugWithLang<ProductDetails>(encodedSlug);
          if (!productDetails.variants || productDetails.variants.length === 0) {
            showToast(t('common.alerts.noVariantsAvailable'), 'warning');
            window.dispatchEvent(new Event('cart-updated'));
            return;
          }

          variantId = productDetails.variants[0].id;
          bodyProductId = productDetails.id;
        }

        const response = await apiClient.post<CartItemPostResponse>('/api/v1/cart/items', {
          productId: bodyProductId,
          variantId,
          quantity: 1,
        });

        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: response.cartSummary ?? null,
          }),
        );
      } catch (error: unknown) {
        console.error('❌ [PRODUCT CARD] Error adding to cart:', error);

        const err = error as {
          message?: string;
          status?: number;
          statusCode?: number;
          response?: {
            data?: {
              detail?: string;
              title?: string;
            };
          };
        };

        if (
          err?.message?.includes('does not exist') ||
          err?.message?.includes('404') ||
          err?.status === 404 ||
          err?.statusCode === 404
        ) {
          showToast(t('common.alerts.productNotFound'), 'error');
          return;
        }

        if (
          err.response?.data?.detail?.includes('No more stock available') ||
          err.response?.data?.detail?.includes('exceeds available stock') ||
          err.response?.data?.title === 'Insufficient stock'
        ) {
          showToast(t('common.alerts.noMoreStockAvailable'), 'warning');
          return;
        }

        showToast(t('common.alerts.failedToAddToCart'), 'error');
        window.dispatchEvent(new Event('cart-updated'));
      } finally {
        inFlightRef.current = false;
      }
    })();
  };

  return { isAddingToCart: false, addToCart };
}
