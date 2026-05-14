'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import { useTranslation } from '../lib/i18n-client';
import { SHOP_LISTING_EAGER_IMAGE_CARD_COUNT } from '@/lib/performance/shop-listing-image-priority.constants';
import type { ProductSortOption } from '@/lib/products/sort';
import {
  SHOP_COMPACT_THREE_COLUMN_MEDIA_QUERY,
  SHOP_LEGACY_DESKTOP_MEDIA_QUERY,
} from '@/lib/layout-breakpoints.constants';
import {
  PRODUCTS_VIEW_MODE_CHANGED_EVENT,
  PRODUCTS_VIEW_MODE_STORAGE_KEY,
  parseProductListingViewMode,
  type ProductListingViewMode,
} from '@/lib/products/view-mode';

interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  price: number;
  compareAtPrice: number | null;
  discountPercent?: number | null;
  image: string | null;
  inStock: boolean;
  brand: {
    id: string;
    name: string;
  } | null;
  defaultVariantId?: string | null;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  categories?: Array<{ id: string; slug?: string; title?: string }>;
}

interface ProductsGridProps {
  products: Product[];
  sortBy?: ProductSortOption;
}

/**
 * Below `xl`: 2 cols phone; `md`–`lg` exclusive three cols (e.g. iPad mini); from `lg` (iPad Pro) two cols until legacy desktop.
 */
/** Mobile: tighter column gap, larger row gap between product cards. */
const SHOP_COMPACT_GRID_CLASS =
  'grid grid-cols-2 gap-x-2 gap-y-5 md:grid-cols-3 md:gap-5 lg:grid-cols-2 lg:gap-6';

function desktopShopGridClass(viewMode: ProductListingViewMode): string {
  if (viewMode === 'list') {
    return 'grid grid-cols-2 gap-x-2 gap-y-5 lg:grid-cols-1 lg:gap-4';
  }
  return 'grid grid-cols-2 gap-x-2 gap-y-5 md:grid-cols-3 lg:grid-cols-3 lg:gap-6';
}

export function ProductsGrid({ products, sortBy = 'default' }: ProductsGridProps) {
  const { t } = useTranslation();
  const [sortedProducts, setSortedProducts] = useState<Product[]>(products);
  const [isCompactThreeColumn, setIsCompactThreeColumn] = useState(false);
  const [isLegacyDesktopShop, setIsLegacyDesktopShop] = useState(false);
  const [listingViewMode, setListingViewMode] =
    useState<ProductListingViewMode>('grid-2');

  useLayoutEffect(() => {
    const mqCompactThree = window.matchMedia(SHOP_COMPACT_THREE_COLUMN_MEDIA_QUERY);
    const mqLegacyDesktop = window.matchMedia(SHOP_LEGACY_DESKTOP_MEDIA_QUERY);
    const apply = () => {
      setIsCompactThreeColumn(mqCompactThree.matches);
      setIsLegacyDesktopShop(mqLegacyDesktop.matches);
    };
    apply();
    mqCompactThree.addEventListener('change', apply);
    mqLegacyDesktop.addEventListener('change', apply);
    return () => {
      mqCompactThree.removeEventListener('change', apply);
      mqLegacyDesktop.removeEventListener('change', apply);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(PRODUCTS_VIEW_MODE_STORAGE_KEY);
    const mode = parseProductListingViewMode(stored);
    setListingViewMode(mode);
    if (stored !== mode) {
      localStorage.setItem(PRODUCTS_VIEW_MODE_STORAGE_KEY, mode);
    }
  }, []);

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ProductListingViewMode>).detail;
      setListingViewMode(parseProductListingViewMode(detail ?? null));
    };
    window.addEventListener(PRODUCTS_VIEW_MODE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PRODUCTS_VIEW_MODE_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    const sorted = [...products];

    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      default:
        break;
    }

    setSortedProducts(sorted);
  }, [products, sortBy]);

  if (sortedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{t('products.grid.noProducts')}</p>
      </div>
    );
  }

  const gridClass = isLegacyDesktopShop
    ? desktopShopGridClass(listingViewMode)
    : SHOP_COMPACT_GRID_CLASS;

  const cardViewMode: ProductListingViewMode = isLegacyDesktopShop
    ? listingViewMode
    : isCompactThreeColumn
      ? 'grid-3'
      : 'grid-2';

  /** Home / mobile card chrome for the whole compact shop (incl. iPad Pro). */
  const useHomeCardChrome = !isLegacyDesktopShop;

  return (
    <div className={gridClass}>
      {sortedProducts.map((product, index) => (
        <div key={product.id} className="h-full min-h-0">
          <ProductCard
            product={{
              ...product,
              compareAtPrice: product.compareAtPrice ?? undefined,
              discountPercent: product.discountPercent ?? undefined,
            }}
            viewMode={cardViewMode}
            homeProductGridCard={useHomeCardChrome}
            shiftImageInFrame={useHomeCardChrome}
            smallerFooterPrice={useHomeCardChrome}
            imageLoadPriority={index < SHOP_LISTING_EAGER_IMAGE_CARD_COUNT}
          />
        </div>
      ))}
    </div>
  );
}
