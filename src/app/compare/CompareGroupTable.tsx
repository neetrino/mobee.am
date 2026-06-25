'use client';

import { memo, useCallback } from 'react';
import type { MouseEvent, MutableRefObject, ReactNode } from 'react';
import Image from 'next/image';
import { apiClient } from '../../lib/api-client';
import { fetchProductBySlugWithLang } from '../../lib/shop/fetchProductBySlugWithLang';
import { dispatchCartFlyAnimation } from '../../lib/cart/dispatchCartFlyAnimation';
import { resolveProductCardImageSrc } from '../../lib/productCardDisplayImage';
import { formatPrice, type CurrencyCode } from '../../lib/currency';
import { upsertGuestCartItem } from '../../lib/cart/guest-cart';
import { showToast } from '../../components/Toast';
import { buildProductCardCachePayload } from '../../lib/products/product-card-cache';
import { ProductCardNavLink } from '../../components/ProductCard/ProductCardNavLink';

export interface CompareTableProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  defaultVariantId?: string | null;
  originalPrice: number | null;
  compareAtPrice: number | null;
  discountPercent: number | null;
  image: string | null;
  inStock: boolean;
  brand: {
    id: string;
    name: string;
  } | null;
  description?: string;
}

interface CompareGroupTableProps {
  products: CompareTableProduct[];
  sectionDomId: string;
  categoryHeading: string;
  compareSummaryLine: string;
  currency: CurrencyCode;
  isLoggedIn: boolean;
  t: (key: string) => string;
  addToCartInFlightRef: MutableRefObject<Set<string>>;
  onRemove: (e: MouseEvent, productId: string) => void;
}

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

async function resolveVariantForCart(product: CompareTableProduct): Promise<{
  variantId: string;
  bodyProductId: string;
} | null> {
  if (product.defaultVariantId) {
    return { variantId: product.defaultVariantId, bodyProductId: product.id };
  }

  const encodedSlug = encodeURIComponent(product.slug.trim());
  const productDetails = await fetchProductBySlugWithLang<ProductDetails>(encodedSlug);

  if (!productDetails.variants || productDetails.variants.length === 0) {
    return null;
  }

  return {
    variantId: productDetails.variants[0].id,
    bodyProductId: productDetails.id,
  };
}

function buildCompareNavPayload(product: CompareTableProduct) {
  return buildProductCardCachePayload({
    id: product.id,
    slug: product.slug,
    title: product.title,
    price: product.price,
    image: product.image,
    inStock: product.inStock,
    brand: product.brand,
    defaultVariantId: product.defaultVariantId,
    compareAtPrice: product.compareAtPrice ?? product.originalPrice,
    discountPercent: product.discountPercent,
  });
}

function CompareProductColumn({
  product,
  onRemove,
  t,
}: {
  product: CompareTableProduct;
  onRemove: (e: MouseEvent, productId: string) => void;
  t: (key: string) => string;
}) {
  return (
    <th className="relative min-w-[220px] px-4 py-3 text-center text-sm font-semibold text-gray-700">
      <button
        type="button"
        onClick={(e) => onRemove(e, product.id)}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-admin-50 hover:text-admin-600"
        title={t('common.buttons.remove')}
        aria-label={t('common.buttons.remove')}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </th>
  );
}

const CompareGroupTableComponent = ({
  products,
  sectionDomId,
  categoryHeading,
  compareSummaryLine,
  currency,
  isLoggedIn,
  t,
  addToCartInFlightRef,
  onRemove,
}: CompareGroupTableProps) => {
  const handleAddToCart = useCallback(
    (e: MouseEvent, product: CompareTableProduct) => {
      e.preventDefault();
      e.stopPropagation();

      if (!product.inStock || addToCartInFlightRef.current.has(product.id)) {
        return;
      }

      const flySource = document.querySelector<HTMLElement>(
        `[data-compare-product-id="${CSS.escape(product.id)}"] [data-cart-fly-source]`,
      );
      const flyUrl = resolveProductCardImageSrc(product.image);

      if (!isLoggedIn) {
        addToCartInFlightRef.current.add(product.id);
        void (async () => {
          try {
            const resolved = await resolveVariantForCart(product);
            if (!resolved) {
              showToast(t('common.alerts.noVariantsAvailable'), 'warning');
              return;
            }

            upsertGuestCartItem({
              productId: resolved.bodyProductId,
              productSlug: product.slug,
              variantId: resolved.variantId,
              quantity: 1,
            });
            window.dispatchEvent(new Event('cart-updated'));
            dispatchCartFlyAnimation(flyUrl, flySource);
          } catch (error: unknown) {
            console.error('Error adding to guest cart:', error);
            showToast(t('common.alerts.failedToAddToCart'), 'error');
          } finally {
            addToCartInFlightRef.current.delete(product.id);
          }
        })();
        return;
      }

      window.dispatchEvent(
        new CustomEvent('cart-updated', {
          detail: { optimisticAdd: { quantity: 1, price: product.price } },
        }),
      );
      dispatchCartFlyAnimation(flyUrl, flySource);
      addToCartInFlightRef.current.add(product.id);

      void (async () => {
        try {
          const resolved = await resolveVariantForCart(product);
          if (!resolved) {
            showToast(t('common.alerts.noVariantsAvailable'), 'warning');
            window.dispatchEvent(new Event('cart-updated'));
            return;
          }

          const response = await apiClient.post<{ cartSummary?: { itemsCount: number; total: number } }>(
            '/api/v1/cart/items',
            {
              productId: resolved.bodyProductId,
              variantId: resolved.variantId,
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
          showToast(t('common.alerts.failedToAddToCart'), 'error');
        } finally {
          addToCartInFlightRef.current.delete(product.id);
        }
      })();
    },
    [addToCartInFlightRef, isLoggedIn, t],
  );

  if (products.length === 0) {
    return null;
  }

  const rows: Array<{ id: string; label: string; renderCell: (product: CompareTableProduct) => ReactNode }> = [
    {
      id: 'image',
      label: t('common.compare.image'),
      renderCell: (product) => (
        <ProductCardNavLink
          slug={product.slug}
          cachePayload={buildCompareNavPayload(product)}
          className="inline-block"
        >
          <div
            className="relative mx-auto h-32 w-32 overflow-hidden rounded-lg bg-gray-100"
            data-cart-fly-source
          >
            <Image
              src={resolveProductCardImageSrc(product.image)}
              alt={product.title}
              fill
              className="object-cover"
              sizes="128px"
              loading="lazy"
            />
          </div>
        </ProductCardNavLink>
      ),
    },
    {
      id: 'name',
      label: t('common.compare.name'),
      renderCell: (product) => (
        <ProductCardNavLink
          slug={product.slug}
          cachePayload={buildCompareNavPayload(product)}
          className="block text-center text-base font-semibold text-gray-900 transition-colors hover:text-blue-600"
        >
          {product.title}
        </ProductCardNavLink>
      ),
    },
    {
      id: 'brand',
      label: t('common.compare.brand'),
      renderCell: (product) => <span>{product.brand ? product.brand.name : '-'}</span>,
    },
    {
      id: 'price',
      label: t('common.compare.price'),
      renderCell: (product) => (
        <p className="text-lg font-bold text-gray-900">{formatPrice(product.price, currency)}</p>
      ),
    },
    {
      id: 'availability',
      label: t('common.compare.availability'),
      renderCell: (product) => (
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
            product.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {product.inStock ? t('common.stock.inStock') : t('common.stock.outOfStock')}
        </span>
      ),
    },
    {
      id: 'actions',
      label: t('common.compare.actions'),
      renderCell: (product) => (
        <div className="flex flex-col items-center gap-2">
          <ProductCardNavLink
            slug={product.slug}
            cachePayload={buildCompareNavPayload(product)}
            className="text-sm font-medium text-black transition-colors hover:text-admin-500"
          >
            {t('common.compare.viewDetails')}
          </ProductCardNavLink>
          {product.inStock && (
            <button
              type="button"
              onClick={(e) => handleAddToCart(e, product)}
              className="rounded-full bg-admin-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-admin-500"
            >
              {t('common.buttons.addToCart')}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="mb-10 last:mb-0" aria-labelledby={sectionDomId}>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id={sectionDomId} className="text-lg font-semibold text-gray-900">
          {categoryHeading}
        </h2>
        <p className="text-sm text-gray-600">{compareSummaryLine}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 min-w-[150px] bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  {t('common.compare.characteristic')}
                </th>
                {products.map((product) => (
                  <CompareProductColumn key={product.id} product={product} onRemove={onRemove} t={t} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-700">
                    {row.label}
                  </td>
                  {products.map((product) => (
                    <td
                      key={product.id}
                      className="px-4 py-4 text-center"
                      data-compare-product-id={row.id === 'image' ? product.id : undefined}
                    >
                      {row.renderCell(product)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export const CompareGroupTable = memo(CompareGroupTableComponent);
