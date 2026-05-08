'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { dispatchCartFlyAnimation } from '../../lib/cart/dispatchCartFlyAnimation';
import { resolveProductCardImageSrc } from '../../lib/productCardDisplayImage';
import { getStoredCurrency } from '../../lib/currency';
import { getStoredLanguage } from '../../lib/language';
import { useTranslation } from '../../lib/i18n-client';
import { useAuth } from '../../lib/auth/AuthContext';
import { EmptyWishlist } from './empty-wishlist';
import { fetchProductBySlugWithLang } from '../../lib/shop/fetchProductBySlugWithLang';
import { SITE_CONTENT_GUTTERS_CLASS } from '../../components/header-strip-layout';
import { WISHLIST_LINE_ITEMS_GRID_CLASS } from '../../components/home-best-choice.constants';
import { WishlistItemCard, type WishlistItemCardProduct } from './wishlist-item-card';

const WISHLIST_KEY = 'shop_wishlist';

function getWishlist(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Wishlist page that shows saved products and supports lightweight CRUD actions.
 */
export default function WishlistPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState<WishlistItemCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const addToCartInFlightRef = useRef<Set<string>>(new Set());
  // Track if we updated locally to prevent unnecessary re-fetch
  const isLocalUpdateRef = useRef(false);

  /**
   * Fetches wishlist products for provided ids and updates component state.
   */
  const fetchWishlistProducts = useCallback(async (idsToLoad: string[]) => {
    if (idsToLoad.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const languagePreference = getStoredLanguage();
      const response = await apiClient.get<{
        data: WishlistItemCardProduct[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>('/api/v1/products', {
        params: {
          limit: '1000',
          lang: languagePreference,
        },
      });

      const wishlistProducts = response.data.filter((product) =>
        idsToLoad.includes(product.id)
      );
      setProducts(wishlistProducts);
    } catch (error) {
      console.error('[Wishlist] Error fetching wishlist products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get wishlist IDs from localStorage
    const ids = getWishlist();
    setWishlistIds(ids);
    fetchWishlistProducts(ids);

    // Listen for wishlist updates from other components (header, etc.)
    // But don't re-fetch if we already updated locally
    const handleWishlistUpdate = () => {
      // If we just updated locally, skip re-fetch to avoid page reload
      if (isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false;
        return;
      }
      
      // Only re-fetch if update came from external source (another component)
      const updatedIds = getWishlist();
      setWishlistIds(updatedIds);
      fetchWishlistProducts(updatedIds);
    };

    const handleCurrencyUpdate = () => {
      setCurrency(getStoredCurrency());
    };

    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    window.addEventListener('currency-updated', handleCurrencyUpdate);
    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
      window.removeEventListener('currency-updated', handleCurrencyUpdate);
    };
  }, [fetchWishlistProducts]);

  const handleRemove = (productId: string) => {
    // Mark as local update to prevent re-fetch in event handler
    isLocalUpdateRef.current = true;
    
    // Optimistic update: remove from UI immediately (no loading state, no page reload)
    const updatedIds = wishlistIds.filter((id) => id !== productId);
    const updatedProducts = products.filter((p) => p.id !== productId);
    
    // Update localStorage first
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updatedIds));
    
    // Update state immediately (no page reload, no loading spinner)
    setWishlistIds(updatedIds);
    setProducts(updatedProducts);
    
    // Dispatch event for other components (header, etc.) - but our handler won't re-fetch
    // because isLocalUpdateRef.current is true
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  const handleAddToCart = (product: WishlistItemCardProduct) => {
    if (!product.inStock || addToCartInFlightRef.current.has(product.id)) {
      return;
    }

    if (!isLoggedIn) {
      router.push(`/login?redirect=/wishlist`);
      return;
    }

    window.dispatchEvent(
      new CustomEvent('cart-updated', {
        detail: { optimisticAdd: { quantity: 1, price: product.price } },
      }),
    );
    const flySource = document.querySelector<HTMLElement>(
      `[data-wishlist-product-id="${CSS.escape(product.id)}"] [data-cart-fly-source]`,
    );
    const flyUrl = resolveProductCardImageSrc(product.image);
    dispatchCartFlyAnimation(flyUrl, flySource);

    addToCartInFlightRef.current.add(product.id);

    void (async () => {
      try {
        interface ProductDetails {
          id: string;
          variants?: Array<{
            id: string;
            sku: string;
            price: number;
            stock: number;
            available: boolean;
          }>;
        }

        let variantId: string;
        let bodyProductId = product.id;

        if (product.defaultVariantId) {
          variantId = product.defaultVariantId;
        } else {
          const encodedSlug = encodeURIComponent(product.slug.trim());
          const productDetails = await fetchProductBySlugWithLang<ProductDetails>(encodedSlug);

          if (!productDetails.variants || productDetails.variants.length === 0) {
            alert(t('common.alerts.noVariantsAvailable'));
            window.dispatchEvent(new Event('cart-updated'));
            return;
          }

          variantId = productDetails.variants[0].id;
          bodyProductId = productDetails.id;
        }

        const response = await apiClient.post<{ cartSummary?: { itemsCount: number; total: number } }>(
          '/api/v1/cart/items',
          {
            productId: bodyProductId,
            variantId,
            quantity: 1,
          },
        );

        window.dispatchEvent(
          new CustomEvent('cart-updated', {
            detail: response.cartSummary ?? null,
          }),
        );
      } catch (error: unknown) {
        console.error('Error adding to cart:', error);
        window.dispatchEvent(new Event('cart-updated'));
        const err = error as { message?: string };
        if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
          router.push(`/login?redirect=/wishlist`);
        }
      } finally {
        addToCartInFlightRef.current.delete(product.id);
      }
    })();
  };

  if (loading) {
    return (
      <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-12`}>
        <div className="animate-pulse">
          <div className="mb-8 h-8 w-1/4 rounded bg-gray-200" />
          <div className={WISHLIST_LINE_ITEMS_GRID_CLASS}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-[400px] rounded-[12px] bg-gray-200 max-lg:rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${SITE_CONTENT_GUTTERS_CLASS} py-12`}>
      <h1 className="mb-8 text-3xl font-bold text-gray-900">{t('common.wishlist.title')}</h1>

      {products.length > 0 ? (
        <>
          <div className={WISHLIST_LINE_ITEMS_GRID_CLASS}>
            {products.map((product) => (
              <WishlistItemCard
                key={product.id}
                product={product}
                currency={currency}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
                t={t}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyWishlist t={t} />
      )}
    </div>
  );
}
