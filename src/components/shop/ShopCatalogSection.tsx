import { DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/language';
import { buildShopProductFiltersFromSearchParams } from '@/lib/shop/build-shop-product-filters';
import { buildProductListCacheKey } from '@/lib/shop/product-list-cache-key';
import { getCachedProductList, type ProductListPayload } from '@/lib/services/products-list-cached';
import { ShopCatalogArea } from '@/components/shop/ShopCatalogArea';
import { isCatalogQueryError } from '@/lib/catalog/catalog-query-error';
import { CATALOG_DEFAULT_LIMIT, CATALOG_DEFAULT_PAGE } from '@/lib/catalog/catalog.constants';

interface ShopCatalogSectionProps {
  searchParams: Record<string, string | undefined>;
}

const EMPTY_LIST_PAYLOAD: ProductListPayload = {
  data: [],
  meta: {
    total: 0,
    page: CATALOG_DEFAULT_PAGE,
    limit: CATALOG_DEFAULT_LIMIT,
    totalPages: 0,
  },
};

/**
 * Server-fetched catalog: shares Redis/in-memory cache with GET /api/v1/products and hydrates the client grid without a duplicate first request.
 */
export async function ShopCatalogSection({ searchParams }: ShopCatalogSectionProps) {
  const language: LanguageCode = DEFAULT_LANGUAGE;

  let initialPayload: ProductListPayload = EMPTY_LIST_PAYLOAD;
  let initialFiltersKey = `invalid:${language}`;

  try {
    const filters = buildShopProductFiltersFromSearchParams(searchParams, language);
    const cached = await getCachedProductList(filters);
    initialPayload = cached.result;
    initialFiltersKey = buildProductListCacheKey(filters);
  } catch (error: unknown) {
    if (!isCatalogQueryError(error)) {
      throw error;
    }
  }

  return (
    <ShopCatalogArea
      initialPayload={initialPayload}
      initialFiltersKey={initialFiltersKey}
      serverLanguage={language}
    />
  );
}
