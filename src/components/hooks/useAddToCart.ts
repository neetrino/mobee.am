'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';
import { dispatchCartFlyAnimation } from '../../lib/cart/dispatchCartFlyAnimation';
import type { CartFlyContext } from '../../lib/cart/cart-fly-animation.types';
import { readGuestCart, upsertGuestCartItem } from '../../lib/cart/guest-cart';
import { fetchProductBySlugWithLang } from '../../lib/shop/fetchProductBySlugWithLang';

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
 * Hook for adding products to cart
 * @param props - Product information
 * @returns Object with loading state and addToCart function
 */
export function useAddToCart({ productId, productSlug, inStock, defaultVariantId, price: propPrice }: UseAddToCartProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const triggerFly = (fly: CartFlyContext | undefined) => {
    if (fly?.imageUrl && fly.flySourceEl) {
      dispatchCartFlyAnimation(fly.imageUrl, fly.flySourceEl);
    }
  };

  const addToCart = async (fly?: CartFlyContext) => {
    if (!inStock) {
      return;
    }

    // Validate product slug before making API call
    if (!productSlug || productSlug.trim() === '' || productSlug.includes(' ')) {
      console.error('❌ [PRODUCT CARD] Invalid product slug:', productSlug);
      alert(t('common.alerts.invalidProduct'));
      return;
    }

    const encodedSlug = encodeURIComponent(productSlug.trim());

    // If user is not logged in, use localStorage for cart
    if (!isLoggedIn) {
      setIsAddingToCart(true);
      try {
        let variantId: string;
        let variantStock: number | undefined;
        let variantPrice: number | undefined = propPrice || undefined;
        if (defaultVariantId) {
          variantId = defaultVariantId;
        } else {
          const productDetails = await fetchProductBySlugWithLang<ProductDetails>(encodedSlug);
          if (!productDetails.variants || productDetails.variants.length === 0) {
            alert(t('common.alerts.noVariantsAvailable'));
            setIsAddingToCart(false);
            return;
          }
          variantId = productDetails.variants[0].id;
          variantStock = productDetails.variants[0].stock;
          if (!variantPrice) variantPrice = productDetails.variants[0].price;
        }

        const existingGuestItem = readGuestCart().find((item) => item.variantId === variantId);
        const nextQuantity = (existingGuestItem?.quantity ?? 0) + 1;

        if (variantStock !== undefined && nextQuantity > variantStock) {
          alert(t('common.alerts.noMoreStockAvailable'));
          setIsAddingToCart(false);
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
          alert(t('common.alerts.productNotFound'));
        } else {
          router.push(`/login?redirect=/products`);
        }
      } finally {
        setIsAddingToCart(false);
      }
      return;
    }

    setIsAddingToCart(true);

    const unitPrice = propPrice ?? 0;
    window.dispatchEvent(new CustomEvent('cart-updated', {
      detail: { optimisticAdd: { quantity: 1, price: unitPrice } },
    }));

    try {
      const productDetails = await fetchProductBySlugWithLang<ProductDetails>(encodedSlug);
      if (!productDetails.variants || productDetails.variants.length === 0) {
        alert(t('common.alerts.noVariantsAvailable'));
        return;
      }

      const variants = productDetails.variants;
      const variantId =
        defaultVariantId && variants.some((v) => v.id === defaultVariantId)
          ? defaultVariantId
          : variants[0].id;

      const canonicalProductId = productDetails.id;

      const response = await apiClient.post<{
        item: { id: string; quantity: number; price: number };
        cartSummary?: { itemsCount: number; total: number };
      }>(
        '/api/v1/cart/items',
        {
          productId: canonicalProductId,
          variantId,
          quantity: 1,
        }
      );

      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: response.cartSummary || null,
      }));
      triggerFly(fly);
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

      if (err?.message?.includes('does not exist') || err?.message?.includes('404') || err?.status === 404 || err?.statusCode === 404) {
        alert(t('common.alerts.productNotFound'));
        setIsAddingToCart(false);
        return;
      }

      if (err.response?.data?.detail?.includes('No more stock available') ||
          err.response?.data?.detail?.includes('exceeds available stock') ||
          err.response?.data?.title === 'Insufficient stock') {
        alert(t('common.alerts.noMoreStockAvailable'));
        setIsAddingToCart(false);
        return;
      }

      if (err.message?.includes('401') || err.message?.includes('Unauthorized') || err?.status === 401 || err?.statusCode === 401) {
        router.push(`/login?redirect=/products`);
      } else {
        alert(t('common.alerts.failedToAddToCart'));
      }
      window.dispatchEvent(new Event('cart-updated'));
    } finally {
      setIsAddingToCart(false);
    }
  };

  return { isAddingToCart, addToCart };
}




