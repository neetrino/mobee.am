import { ProductFilters, ProductWithRelations } from "./products-find-query.service";
import { normalizeCatalogQuery } from "@/lib/catalog/catalog-query";
import { productMatchesBrandTokens } from "@/lib/catalog/brand-where";
import { variantMatchesColorAndSize, type CatalogOptionLike } from "@/lib/catalog/variant-option-where";
import { rowMatchesPriceFilter } from "@/lib/catalog/catalog-price";
import { sortCatalogRows } from "@/lib/catalog/catalog-sort";
import { productHasMarcoListingImage } from "../products/marco-product-image";
import type { CatalogLightRow } from "@/lib/catalog/catalog-light.types";
import type { ProductDiscountContext } from "./products-find-transform.service";
import type { CanonicalCatalogQuery } from "@/lib/catalog/catalog-query";

const NO_DISCOUNTS: ProductDiscountContext = {
  globalDiscount: 0,
  categoryDiscounts: {},
  brandDiscounts: {},
};

function asLightRow(product: ProductWithRelations): CatalogLightRow {
  return product as unknown as CatalogLightRow;
}

function matchesCatalogFilters(
  product: ProductWithRelations,
  query: CanonicalCatalogQuery,
  discounts: ProductDiscountContext,
): boolean {
  const row = asLightRow(product);
  if (!productMatchesBrandTokens(row, query.brands)) {
    return false;
  }
  if (query.colors.length > 0 || query.sizes.length > 0) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const matched = variants.some((variant) =>
          variantMatchesColorAndSize(
            variant.options as CatalogOptionLike[],
            query.colors,
            query.sizes,
            query.lang,
          ),
    );
    if (!matched) {
      return false;
    }
  }
  if (!rowMatchesPriceFilter(row, discounts, query.minPrice, query.maxPrice)) {
    return false;
  }
  return !(query.filter === "new" && productHasMarcoListingImage(product));
}

class ProductsFindFilterService {
  /**
   * In-memory matchers shared with tests. Live listing uses the DB pipeline.
   */
  filterProducts(
    products: ProductWithRelations[],
    filters: ProductFilters,
    bestsellerProductIds: string[],
    discounts: ProductDiscountContext = NO_DISCOUNTS,
  ): ProductWithRelations[] {
    const query = normalizeCatalogQuery(filters);
    const filtered = products.filter((product) =>
      matchesCatalogFilters(product, query, discounts),
    );
    const sort =
      query.filter === "bestseller" || query.sort === "bestseller"
        ? "bestseller"
        : query.sort;
    const sorted = sortCatalogRows(
      filtered.map(asLightRow),
      sort,
      query.lang,
      discounts,
      bestsellerProductIds,
    );
    const order = new Map(sorted.map((row, index) => [row.id, index]));
    return [...filtered].sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  }
}

export const productsFindFilterService = new ProductsFindFilterService();
