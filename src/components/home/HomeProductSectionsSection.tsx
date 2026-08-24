import type { LanguageCode } from "@/lib/language";
import {
  buildHomeFeaturedProductFilters,
  buildHomeSpecialOffersProductFilters,
} from "@/lib/home/home-product-filters";
import { buildProductListCacheKey } from "@/lib/shop/product-list-cache-key";
import { getCachedHomeBrands } from "@/lib/services/home-brands-cached";
import {
  getCachedProductList,
  type ProductListPayload,
} from "@/lib/services/products-list-cached";
import { HomeProductSections } from "@/components/FeaturedProductsTabs";
import type { FeaturedHomeProduct } from "@/components/useFeaturedHomeProducts";
import { isMarcoHostedProductImageUrl } from "@/lib/products/marco-product-image";

type HomeProductSectionsSectionProps = {
  language: LanguageCode;
};

function mapPayloadToFeaturedProducts(payload: ProductListPayload): FeaturedHomeProduct[] {
  return ((payload.data ?? []) as FeaturedHomeProduct[]).filter(
    (product) => !isMarcoHostedProductImageUrl(product.image),
  );
}

/**
 * Server-fetched home product rows — shares Redis cache with GET /api/v1/products.
 */
export async function HomeProductSectionsSection({ language }: HomeProductSectionsSectionProps) {
  const featuredFilters = buildHomeFeaturedProductFilters(language);
  const specialOffersFilters = buildHomeSpecialOffersProductFilters(language);

  const [{ result: featuredPayload }, { result: specialOffersPayload }, { result: homeBrands }] =
    await Promise.all([
      getCachedProductList(featuredFilters),
      getCachedProductList(specialOffersFilters),
      getCachedHomeBrands(language),
    ]);

  return (
    <HomeProductSections
      serverLanguage={language}
      initialFeaturedProducts={mapPayloadToFeaturedProducts(featuredPayload)}
      initialFeaturedFiltersKey={buildProductListCacheKey(featuredFilters)}
      initialSpecialOffersProducts={mapPayloadToFeaturedProducts(specialOffersPayload)}
      initialSpecialOffersFiltersKey={buildProductListCacheKey(specialOffersFilters)}
      homeBrands={homeBrands.data}
    />
  );
}
