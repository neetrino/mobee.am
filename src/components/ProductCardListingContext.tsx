'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTranslation } from '@/lib/i18n-client';
import { getLoginUrlWithRedirect } from '@/lib/auth/loginRedirectUrl';
import { queueWishlistProductForAfterLogin } from '@/lib/wishlist/pendingWishlistAfterLogin';
import {
  isProductInWishlist,
  toggleWishlistProductId,
} from '@/lib/wishlist/wishlist-storage';
import {
  isProductIdInCompare,
  toggleCompareProduct,
} from '@/lib/shop/compare-storage';
import { showToast } from '@/components/Toast';
import { useCurrency } from '@/components/hooks/useCurrency';
import type { CurrencyCode } from '@/lib/currency';

export interface ProductCardListingInteractions {
  currency: CurrencyCode;
  isInWishlist: boolean;
  isInCompare: boolean;
  onWishlistToggle: (event: MouseEvent) => void;
  onCompareToggle: (event: MouseEvent) => void;
}

interface ProductCardListingContextValue {
  currency: CurrencyCode;
  isInWishlist: (productId: string) => boolean;
  isInCompare: (productId: string) => boolean;
  createWishlistToggle: (productId: string) => (event: MouseEvent) => void;
  createCompareToggle: (
    productId: string,
    compareCategoryId: string,
  ) => (event: MouseEvent) => void;
}

const ProductCardListingContext = createContext<ProductCardListingContextValue | null>(null);

export function ProductCardListingProvider({ children }: { children: ReactNode }) {
  const currency = useCurrency();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [clientStorageReady, setClientStorageReady] = useState(false);
  const [wishlistVersion, setWishlistVersion] = useState(0);
  const [compareVersion, setCompareVersion] = useState(0);

  useEffect(() => {
    setClientStorageReady(true);

    const onWishlistUpdate = () => setWishlistVersion((value) => value + 1);
    const onCompareUpdate = () => setCompareVersion((value) => value + 1);
    window.addEventListener('wishlist-updated', onWishlistUpdate);
    window.addEventListener('compare-updated', onCompareUpdate);
    return () => {
      window.removeEventListener('wishlist-updated', onWishlistUpdate);
      window.removeEventListener('compare-updated', onCompareUpdate);
    };
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => {
      void wishlistVersion;
      if (!clientStorageReady) {
        return false;
      }
      return isProductInWishlist(productId);
    },
    [wishlistVersion, clientStorageReady],
  );

  const isInCompare = useCallback(
    (productId: string) => {
      void compareVersion;
      if (!clientStorageReady) {
        return false;
      }
      return isProductIdInCompare(productId);
    },
    [compareVersion, clientStorageReady],
  );

  const createWishlistToggle = useCallback(
    (productId: string) => (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window === 'undefined') {
        return;
      }

      const alreadyInWishlist = isProductInWishlist(productId);
      if (authLoading && !alreadyInWishlist) {
        return;
      }
      if (!isLoggedIn && !alreadyInWishlist) {
        queueWishlistProductForAfterLogin(productId);
        router.push(getLoginUrlWithRedirect(pathname || '/'));
        return;
      }

      try {
        toggleWishlistProductId(productId);
        setWishlistVersion((value) => value + 1);
      } catch (error) {
        console.error('Error updating wishlist:', error);
      }
    },
    [authLoading, isLoggedIn, pathname, router],
  );

  const createCompareToggle = useCallback(
    (productId: string, compareCategoryId: string) => (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const { outcome } = toggleCompareProduct(productId, compareCategoryId);
        if (outcome === 'group_full') {
          showToast(t('common.alerts.compareMaxReached'), 'warning');
          return;
        }
        setCompareVersion((value) => value + 1);
        window.dispatchEvent(new Event('compare-updated'));
      } catch (error) {
        console.error('Error updating compare:', error);
      }
    },
    [t],
  );

  const value = useMemo(
    () => ({
      currency,
      isInWishlist,
      isInCompare,
      createWishlistToggle,
      createCompareToggle,
    }),
    [currency, isInWishlist, isInCompare, createWishlistToggle, createCompareToggle],
  );

  return (
    <ProductCardListingContext.Provider value={value}>
      {children}
    </ProductCardListingContext.Provider>
  );
}

export function useProductCardListingContext(): ProductCardListingContextValue | null {
  return useContext(ProductCardListingContext);
}

export function useProductCardListingInteractions(
  productId: string,
  compareCategoryId: string,
): ProductCardListingInteractions | null {
  const listing = useProductCardListingContext();
  if (!listing) {
    return null;
  }

  return {
    currency: listing.currency,
    isInWishlist: listing.isInWishlist(productId),
    isInCompare: listing.isInCompare(productId),
    onWishlistToggle: listing.createWishlistToggle(productId),
    onCompareToggle: listing.createCompareToggle(productId, compareCategoryId),
  };
}
