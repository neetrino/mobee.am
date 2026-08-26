import { pickProductTranslation } from "@/lib/products/pickProductTranslation";
import { productHasMarcoListingImage } from "@/lib/products/marco-product-image";
import type { ProductDiscountContext } from "@/lib/services/products-find-transform.service";
import type { ProductSortOption } from "@/lib/products/sort";
import type { CatalogLightRow } from "./catalog-light.types";
import { catalogListingPrice } from "./catalog-price";

function createdAtMs(row: CatalogLightRow): number {
  return new Date(row.createdAt).getTime();
}

function tieBreak(a: CatalogLightRow, b: CatalogLightRow): number {
  const created = createdAtMs(b) - createdAtMs(a);
  if (created !== 0) {
    return created;
  }
  return a.id.localeCompare(b.id);
}

function demoteMarco(a: CatalogLightRow, b: CatalogLightRow, compare: () => number): number {
  const aMarco = productHasMarcoListingImage(a);
  const bMarco = productHasMarcoListingImage(b);
  if (aMarco !== bMarco) {
    return aMarco ? 1 : -1;
  }
  return compare();
}

function titleOf(row: CatalogLightRow, lang: string): string {
  const translation = pickProductTranslation(row.translations ?? [], lang);
  return translation?.title ?? row.translations?.[0]?.title ?? "";
}

function compareByPrice(
  a: CatalogLightRow,
  b: CatalogLightRow,
  sort: "price-asc" | "price-desc",
  discounts: ProductDiscountContext,
): number {
  const aPrice = catalogListingPrice(a, discounts);
  const bPrice = catalogListingPrice(b, discounts);
  const aMissing = aPrice === null;
  const bMissing = bPrice === null;
  if (aMissing && bMissing) {
    return tieBreak(a, b);
  }
  if (aMissing) {
    return 1;
  }
  if (bMissing) {
    return -1;
  }
  if (aPrice !== bPrice) {
    return sort === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
  }
  return tieBreak(a, b);
}

function compareBySort(
  a: CatalogLightRow,
  b: CatalogLightRow,
  sort: ProductSortOption,
  lang: string,
  discounts: ProductDiscountContext,
  bestsellerRank: Map<string, number>,
): number {
  if (sort === "price-asc" || sort === "price-desc") {
    return compareByPrice(a, b, sort, discounts);
  }
  if (sort === "name-asc" || sort === "name-desc") {
    const compare = titleOf(a, lang).localeCompare(titleOf(b, lang), lang, {
      sensitivity: "base",
    });
    if (compare !== 0) {
      return sort === "name-asc" ? compare : -compare;
    }
    return tieBreak(a, b);
  }
  if (sort === "bestseller" && bestsellerRank.size > 0) {
    const aRank = bestsellerRank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bRank = bestsellerRank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    return tieBreak(a, b);
  }
  return tieBreak(a, b);
}

/**
 * Full-dataset catalog sort. Marco images are demoted; ID/createdAt break ties.
 */
export function sortCatalogRows(
  rows: CatalogLightRow[],
  sort: ProductSortOption,
  lang: string,
  discounts: ProductDiscountContext,
  bestsellerProductIds: string[],
): CatalogLightRow[] {
  const rank = new Map<string, number>();
  bestsellerProductIds.forEach((id, index) => rank.set(id, index));

  return [...rows].sort((a, b) =>
    demoteMarco(a, b, () => compareBySort(a, b, sort, lang, discounts, rank)),
  );
}
