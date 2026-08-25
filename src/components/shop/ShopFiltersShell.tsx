import {
  ProductsFiltersProvider,
  type ProductsFiltersData,
  type ShopTopCategoryOption,
} from '@/components/ProductsFiltersProvider';
import { getCachedTopCategories } from '@/lib/services/categories-top-cached';
import { getCachedProductFilters } from '@/lib/services/products-filters-cached';
import { buildProductFiltersCacheKey } from '@/lib/shop/product-filters-cache-key';
import { buildShopProductFiltersFromSearchParams } from '@/lib/shop/build-shop-product-filters';
import { isCatalogQueryError } from '@/lib/catalog/catalog-query-error';
import type { ProductFilters } from '@/lib/services/products-find-query/types';
import type { LanguageCode } from '@/lib/language';
import type { ReactNode } from 'react';

const SHOP_CATEGORY_FILTER_LIMIT = 100;

export type ShopFiltersShellProps = {
  language: LanguageCode;
  searchParams: Record<string, string | undefined>;
  children: ReactNode;
};

const EMPTY_FILTERS: ProductsFiltersData = {
  colors: [],
  sizes: [],
  brands: [],
  priceRange: { min: 0, max: 0, hasProducts: false, stepSize: null, stepSizePerCurrency: null },
};

function defaultShopFilters(language: LanguageCode): ProductFilters {
  return { lang: language, page: 1, limit: 12, sort: 'default' };
}

function parseShopFilters(
  searchParams: Record<string, string | undefined>,
  language: LanguageCode,
): ProductFilters {
  try {
    return buildShopProductFiltersFromSearchParams(searchParams, language);
  } catch (error: unknown) {
    if (!isCatalogQueryError(error)) {
      throw error;
    }
    return defaultShopFilters(language);
  }
}

/**
 * Server-prefetches facet filters + top categories so the shop sidebar hydrates without a client fetch waterfall.
 */
export async function ShopFiltersShell({
  language,
  searchParams,
  children,
}: ShopFiltersShellProps) {
  const filters = parseShopFilters(searchParams, language);
  const filterInput = {
    category: filters.category,
    search: filters.search,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    lang: filters.lang,
    brand: filters.brand,
    colors: filters.colors,
    sizes: filters.sizes,
    filter: filters.filter,
  };
  const initialFiltersKey = buildProductFiltersCacheKey(filterInput);

  const topCategoriesPromise = getCachedTopCategories(language, SHOP_CATEGORY_FILTER_LIMIT, {
    includeImages: false,
  });

  let initialFiltersData = EMPTY_FILTERS;
  try {
    const { result } = await getCachedProductFilters(filterInput);
    initialFiltersData = result as ProductsFiltersData;
  } catch (error: unknown) {
    if (!isCatalogQueryError(error)) {
      throw error;
    }
  }

  const { result: topCategoriesResult } = await topCategoriesPromise;
  const initialTopCategories: ShopTopCategoryOption[] = topCategoriesResult.data.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    productCount: item.productCount,
  }));

  return (
    <ProductsFiltersProvider
      category={filters.category}
      search={filters.search}
      minPrice={filters.minPrice != null ? String(filters.minPrice) : undefined}
      maxPrice={filters.maxPrice != null ? String(filters.maxPrice) : undefined}
      brand={filters.brand}
      colors={filters.colors}
      sizes={filters.sizes}
      filter={filters.filter}
      initialFiltersData={initialFiltersData}
      initialTopCategories={initialTopCategories}
      initialFiltersKey={initialFiltersKey}
    >
      {children}
    </ProductsFiltersProvider>
  );
}
