'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { ProductCard } from './ProductCard';
import { useTranslation } from '../lib/i18n-client';
import type { ProductSortOption } from '@/lib/products/sort';
import {
  LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY,
  SHOP_LEGACY_DESKTOP_MEDIA_QUERY,
  SHOP_TABLET_THREE_COL_MEDIA_QUERY,
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
}

interface ProductsGridProps {
  products: Product[];
  sortBy?: ProductSortOption;
}

/**
 * Mobile / tablet / iPad (below Tailwind `xl`): 2 cols phone, 3 cols iPad Mini band, 2 cols storefront `lg`–`xl`.
 */
const SHOP_COMPACT_GRID_CLASS =
  'grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-5 lg:grid-cols-2 lg:gap-6';

function desktopShopGridClass(viewMode: ProductListingViewMode): string {
  if (viewMode === 'list') {
    return 'grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-4';
  }
  return 'grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-3 lg:gap-6';
}

export function ProductsGrid({ products, sortBy = 'default' }: ProductsGridProps) {
  const { t } = useTranslation();
  const [sortedProducts, setSortedProducts] = useState<Product[]>(products);
  const [isDesktopShell, setIsDesktopShell] = useState(false);
  const [isShopTabletThreeCol, setIsShopTabletThreeCol] = useState(false);
  const [isLegacyDesktopShop, setIsLegacyDesktopShop] = useState(false);
  const [listingViewMode, setListingViewMode] =
    useState<ProductListingViewMode>('grid-2');

  useLayoutEffect(() => {
    const mqDesktop = window.matchMedia(LAYOUT_DESKTOP_MIN_WIDTH_MEDIA_QUERY);
    const mqTabletThree = window.matchMedia(SHOP_TABLET_THREE_COL_MEDIA_QUERY);
    const mqLegacyDesktop = window.matchMedia(SHOP_LEGACY_DESKTOP_MEDIA_QUERY);
    const apply = () => {
      setIsDesktopShell(mqDesktop.matches);
      setIsShopTabletThreeCol(mqTabletThree.matches);
      setIsLegacyDesktopShop(mqLegacyDesktop.matches);
    };
    apply();
    mqDesktop.addEventListener('change', apply);
    mqTabletThree.addEventListener('change', apply);
    mqLegacyDesktop.addEventListener('change', apply);
    return () => {
      mqDesktop.removeEventListener('change', apply);
      mqTabletThree.removeEventListener('change', apply);
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
    : isShopTabletThreeCol
      ? 'grid-3'
      : 'grid-2';

  const useHomeCardChrome = !isLegacyDesktopShop && !isDesktopShell;

  return (
    <div className={gridClass}>
      {sortedProducts.map((product) => (
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
          />
        </div>
      ))}
    </div>
  );
}
