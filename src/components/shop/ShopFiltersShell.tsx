import { ProductsFiltersProvider, type ProductsFiltersData, type ShopTopCategoryOption } from '@/components/ProductsFiltersProvider';
import { getCachedTopCategories } from '@/lib/services/categories-top-cached';
import { getCachedProductFilters } from '@/lib/services/products-filters-cached';
import { buildProductFiltersCacheKey } from '@/lib/shop/product-filters-cache-key';
import type { LanguageCode } from '@/lib/language';
import type { ReactNode } from 'react';

const SHOP_CATEGORY_FILTER_LIMIT = 100;

export type ShopFiltersShellProps = {
  language: LanguageCode;
  searchParams: Record<string, string | undefined>;
  children: ReactNode;
};

function parseOptionalPrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Server-prefetches facet filters + top categories so the shop sidebar hydrates without a client fetch waterfall.
 */
export async function ShopFiltersShell({
  language,
  searchParams,
  children,
}: ShopFiltersShellProps) {
  const filterInput = {
    category: searchParams.category,
    search: searchParams.search,
    minPrice: parseOptionalPrice(searchParams.minPrice),
    maxPrice: parseOptionalPrice(searchParams.maxPrice),
    lang: language,
  };
  const initialFiltersKey = buildProductFiltersCacheKey(filterInput);

  const [{ result: initialFiltersData }, { result: topCategoriesResult }] = await Promise.all([
    getCachedProductFilters(filterInput),
    getCachedTopCategories(language, SHOP_CATEGORY_FILTER_LIMIT, { includeImages: false }),
  ]);

  const initialTopCategories: ShopTopCategoryOption[] = topCategoriesResult.data.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    productCount: item.productCount,
  }));

  return (
    <ProductsFiltersProvider
      category={searchParams.category}
      search={searchParams.search}
      minPrice={searchParams.minPrice}
      maxPrice={searchParams.maxPrice}
      initialFiltersData={initialFiltersData as ProductsFiltersData}
      initialTopCategories={initialTopCategories}
      initialFiltersKey={initialFiltersKey}
    >
      {children}
    </ProductsFiltersProvider>
  );
}
