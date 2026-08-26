import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from '@/lib/i18n/navigation';
import { apiClient } from '../../../../../lib/api-client';
import { getStoredLanguage, type LanguageCode } from '../../../../../lib/language';
import {
  readProductCardCache,
  type ProductCardCachePayload,
} from '../../../../../lib/products/product-card-cache';
import { RESERVED_ROUTES } from '../types';
import type { Product } from '../types';

interface UseProductFetchProps {
  slug: string;
  variantIdFromUrl: string | null;
  initialProduct?: Product | null;
  initialLocale?: LanguageCode;
  initialNotFound?: boolean;
}

type FetchProductOptions = {
  background?: boolean;
};

export function useProductFetch({
  slug,
  variantIdFromUrl,
  initialProduct = null,
  initialLocale,
  initialNotFound = false,
}: UseProductFetchProps) {
  const router = useRouter();
  const hasInitialProduct = initialProduct !== null;
  const initialShell = !hasInitialProduct && slug ? readProductCardCache(slug) : null;

  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [shellProduct, setShellProduct] = useState<ProductCardCachePayload | null>(initialShell);
  const [loading, setLoading] = useState(!hasInitialProduct && !initialShell && !initialNotFound);
  const [fetchPending, setFetchPending] = useState(
    !hasInitialProduct && !initialNotFound,
  );
  const productRef = useRef(product);
  const shellProductRef = useRef(shellProduct);
  productRef.current = product;
  shellProductRef.current = shellProduct;

  const fetchProduct = useCallback(
    async (options?: FetchProductOptions) => {
      if (!slug || RESERVED_ROUTES.includes(slug.toLowerCase())) {
        return;
      }

      const background = options?.background ?? false;

      try {
        if (!background && !productRef.current && !shellProductRef.current) {
          setLoading(true);
        }
        if (!background || !productRef.current) {
          setFetchPending(true);
        }

        const currentLang = getStoredLanguage();
        let data: Product;

        try {
          data = await apiClient.get<Product>(`/api/v1/products/${slug}`, {
            params: { lang: currentLang },
          });
        } catch (error: unknown) {
          const errorStatus =
            error && typeof error === 'object' && 'status' in error
              ? Number(error.status)
              : undefined;
          if (errorStatus === 404 && currentLang !== 'en') {
            try {
              data = await apiClient.get<Product>(`/api/v1/products/${slug}`, {
                params: { lang: 'en' },
              });
            } catch {
              throw error;
            }
          } else {
            throw error;
          }
        }

        setProduct(data);
        setShellProduct(null);
      } catch (error: unknown) {
        const err = error as { status?: number };
        if (err?.status === 404) {
          if (!background || !productRef.current) {
            setProduct(null);
            setShellProduct(null);
          }
        }
      } finally {
        setLoading(false);
        setFetchPending(false);
      }
    },
    [slug, variantIdFromUrl],
  );

  useEffect(() => {
    if (!slug) {
      return;
    }
    if (RESERVED_ROUTES.includes(slug.toLowerCase())) {
      router.replace(`/${slug}`);
    }
  }, [slug, router]);

  useEffect(() => {
    if (!slug || RESERVED_ROUTES.includes(slug.toLowerCase())) {
      return;
    }

    if (initialNotFound) {
      return;
    }

    const clientLang = getStoredLanguage();
    const localeMatchesInitial =
      hasInitialProduct && initialLocale !== undefined && clientLang === initialLocale;

    if (localeMatchesInitial) {
      const handleLanguageUpdate = () => {
        void fetchProduct({ background: true });
      };

      window.addEventListener('language-updated', handleLanguageUpdate);
      return () => {
        window.removeEventListener('language-updated', handleLanguageUpdate);
      };
    }

    if (!hasInitialProduct) {
      const cachedShell = readProductCardCache(slug);
      if (cachedShell) {
        setShellProduct(cachedShell);
        setLoading(false);
      }
      void fetchProduct();
    } else {
      void fetchProduct({ background: true });
    }

    const handleLanguageUpdate = () => {
      void fetchProduct({ background: Boolean(productRef.current) });
    };

    window.addEventListener('language-updated', handleLanguageUpdate);
    return () => {
      window.removeEventListener('language-updated', handleLanguageUpdate);
    };
  }, [
    slug,
    variantIdFromUrl,
    fetchProduct,
    hasInitialProduct,
    initialLocale,
    initialNotFound,
  ]);

  const isNotFound =
    initialNotFound || (!fetchPending && !product && !shellProduct);

  return { product, shellProduct, loading, fetchPending, isNotFound, fetchProduct };
}
