import { productHasMarcoListingImage } from "@/lib/products/marco-product-image";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import type { CanonicalCatalogQuery } from "./catalog-query";
import type { CatalogLightRow } from "./catalog-light.types";
import { productMatchesBrandTokens } from "./brand-where";
import { rowMatchesPriceFilter } from "./catalog-price";
import { variantMatchesColorSizeAndAttrs } from "./variant-option-where";
import {
  catalogAttrSelectionIsEmpty,
  type CatalogAttrSelection,
} from "./catalog-attrs";

export type FacetOmitDimension = "brand" | "colors" | "sizes" | "price" | "attrs";

function rowMatchesOptions(
  row: CatalogLightRow,
  colors: string[],
  sizes: string[],
  attrs: CatalogAttrSelection,
  lang: string,
): boolean {
  if (
    colors.length === 0 &&
    sizes.length === 0 &&
    catalogAttrSelectionIsEmpty(attrs)
  ) {
    return true;
  }
  const variants = Array.isArray(row.variants) ? row.variants : [];
  return variants.some((variant) =>
    variantMatchesColorSizeAndAttrs(variant.options, colors, sizes, attrs, lang),
  );
}

/**
 * Apply remaining facet dimensions, omitting the one whose counts are being built.
 */
export function rowMatchesFacetQuery(
  row: CatalogLightRow,
  query: CanonicalCatalogQuery,
  discounts: ProductDiscountContext,
  omit: ReadonlySet<FacetOmitDimension>,
): boolean {
  if (query.filter === "new" && productHasMarcoListingImage(row)) {
    return false;
  }
  if (!omit.has("brand") && !productMatchesBrandTokens(row, query.brands)) {
    return false;
  }
  const colors = omit.has("colors") ? [] : query.colors;
  const sizes = omit.has("sizes") ? [] : query.sizes;
  const attrs = omit.has("attrs") ? {} : query.attrs;
  if (!rowMatchesOptions(row, colors, sizes, attrs, query.lang)) {
    return false;
  }
  if (!omit.has("price")) {
    return rowMatchesPriceFilter(row, discounts, query.minPrice, query.maxPrice);
  }
  return true;
}

export function selectFacetRows(
  rows: CatalogLightRow[],
  query: CanonicalCatalogQuery,
  discounts: ProductDiscountContext,
  omit: FacetOmitDimension,
): CatalogLightRow[] {
  const omitted = new Set<FacetOmitDimension>([omit]);
  return rows.filter((row) => rowMatchesFacetQuery(row, query, discounts, omitted));
}
