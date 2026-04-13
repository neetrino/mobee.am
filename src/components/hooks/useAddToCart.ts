'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth/AuthContext';
import { useTranslation } from '../../lib/i18n-client';

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

  const addToCart = async () => {
    if (!inStock) {
      return;
    }

    // Validate product slug before making API call
    if (!productSlug || productSlug.trim() === '' || productSlug.includes(' ')) {
      console.error('❌ [PRODUCT CARD] Invalid product slug:', productSlug);
      alert(t('common.alerts.invalidProduct'));
      return;
    }

    // If user is not logged in, use localStorage for cart
    if (!isLoggedIn) {
      setIsAddingToCart(true);
      try {
        const CART_KEY = 'shop_cart_guest';
        const stored = localStorage.getItem(CART_KEY);
        const cart: Array<{ productId: string; productSlug: string; variantId?: string; quantity: number; price?: number }> = stored ? JSON.parse(stored) : [];

        let variantId: string;
        let variantStock: number | undefined;
        let variantPrice: number | undefined = propPrice || undefined;
        if (defaultVariantId) {
          variantId = defaultVariantId;
        } else {
          const encodedSlug = encodeURIComponent(productSlug.trim());
          const productDetails = await apiClient.get<ProductDetails>(`/api/v1/products/${encodedSlug}`);
          if (!productDetails.variants || productDetails.variants.length === 0) {
            alert(t('common.alerts.noVariantsAvailable'));
            setIsAddingToCart(false);
            return;
          }
          variantId = productDetails.variants[0].id;
          variantStock = productDetails.variants[0].stock;
          if (!variantPrice) variantPrice = productDetails.variants[0].price;
        }

        const existingItem = cart.find(item => item.productId === productId && item.variantId === variantId);
        const currentQuantityInCart = existingItem?.quantity || 0;
        const totalQuantity = currentQuantityInCart + 1;

        if (variantStock !== undefined && totalQuantity > variantStock) {
          alert(t('common.alerts.noMoreStockAvailable'));
          setIsAddingToCart(false);
          return;
        }

        if (existingItem) {
          existingItem.quantity = totalQuantity;
          if (!existingItem.productSlug) existingItem.productSlug = productSlug;
          if (variantPrice) existingItem.price = variantPrice;
        } else {
          cart.push({
            productId,
            productSlug,
            variantId,
            quantity: 1,
            price: variantPrice || 0,
          });
        }

        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        window.dispatchEvent(new Event('cart-updated'));
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
      let variantId: string;
      if (defaultVariantId) {
        variantId = defaultVariantId;
      } else {
        const encodedSlug = encodeURIComponent(productSlug.trim());
        const productDetails = await apiClient.get<ProductDetails>(`/api/v1/products/${encodedSlug}`);
        if (!productDetails.variants || productDetails.variants.length === 0) {
          alert(t('common.alerts.noVariantsAvailable'));
          return;
        }
        variantId = productDetails.variants[0].id;
      }

      const response = await apiClient.post<{
        item: { id: string; quantity: number; price: number };
        cartSummary?: { itemsCount: number; total: number };
      }>(
        '/api/v1/cart/items',
        {
          productId: productId,
          variantId: variantId,
          quantity: 1,
        }
      );

      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: response.cartSummary || null,
      }));
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




