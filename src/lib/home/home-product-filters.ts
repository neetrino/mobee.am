import type { LanguageCode } from "@/lib/language";
import type { ProductFilters } from "@/lib/services/products-find-query/types";

export const HOME_PRODUCTS_PER_PAGE = 10;

export const HOME_FEATURED_FILTER = "new" as const;
export const HOME_SPECIAL_OFFERS_FILTER = "featured" as const;

export function buildHomeFeaturedProductFilters(lang: LanguageCode): ProductFilters {
  return {
    page: 1,
    limit: HOME_PRODUCTS_PER_PAGE,
    lang,
    filter: HOME_FEATURED_FILTER,
  };
}

export function buildHomeSpecialOffersProductFilters(lang: LanguageCode): ProductFilters {
  return {
    page: 1,
    limit: HOME_PRODUCTS_PER_PAGE,
    lang,
    filter: HOME_SPECIAL_OFFERS_FILTER,
  };
}
