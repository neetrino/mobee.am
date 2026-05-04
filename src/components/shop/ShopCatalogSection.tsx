import { cookies } from 'next/headers';
import { readLanguageFromCookies, type LanguageCode } from '@/lib/language';
import { buildShopProductFiltersFromSearchParams } from '@/lib/shop/build-shop-product-filters';
import { buildProductListCacheKey } from '@/lib/shop/product-list-cache-key';
import { getCachedProductList } from '@/lib/services/products-list-cached';
import { ShopCatalogArea } from '@/components/shop/ShopCatalogArea';

interface ShopCatalogSectionProps {
  searchParams: Record<string, string | undefined>;
}

/**
 * Server-fetched catalog: shares Redis/in-memory cache with GET /api/v1/products and hydrates the client grid without a duplicate first request.
 */
export async function ShopCatalogSection({ searchParams }: ShopCatalogSectionProps) {
  const cookieStore = await cookies();
  const language: LanguageCode = readLanguageFromCookies(cookieStore);
  const filters = buildShopProductFiltersFromSearchParams(searchParams, language);
  const { result: initialPayload } = await getCachedProductList(filters);
  const initialFiltersKey = buildProductListCacheKey(filters);

  return (
    <ShopCatalogArea
      initialPayload={initialPayload}
      initialFiltersKey={initialFiltersKey}
      serverLanguage={language}
    />
  );
}
