import type { Prisma } from "@white-shop/db";
import type { CanonicalCatalogQuery } from "@/lib/catalog/catalog-query";
import { CATALOG_NEW_ARRIVAL_DAYS } from "@/lib/catalog/catalog.constants";
import { CatalogQueryError } from "@/lib/catalog/catalog-query-error";
import { resolveBrandIds } from "@/lib/catalog/brand-where";
import { findCategoryBySlug } from "@/lib/services/products-find-query/category-utils";
import { listingColorSizeComboTokens } from "@/lib/read-model/product-listing-row-tokens";

function newArrivalSince(): Date {
  const since = new Date();
  since.setDate(since.getDate() - CATALOG_NEW_ARRIVAL_DAYS);
  return since;
}

async function resolveCategoryIds(
  slugs: string[],
  lang: string,
): Promise<string[] | null> {
  if (slugs.length === 0) {
    return [];
  }
  const ids: string[] = [];
  for (const slug of slugs) {
    const category = await findCategoryBySlug(slug, lang);
    if (!category) {
      throw new CatalogQueryError(`Unknown category: ${slug}`);
    }
    ids.push(category.id);
  }
  return ids;
}

/**
 * Prisma where for ProductListingRow. Empty-brand resolution returns null (no rows).
 */
export async function buildListingRowWhere(
  query: CanonicalCatalogQuery,
  bestsellerProductIds: string[],
): Promise<Prisma.ProductListingRowWhereInput | null> {
  const parts: Prisma.ProductListingRowWhereInput[] = [
    {
      locale: query.lang,
      isPublished: true,
      deletedAt: null,
    },
  ];

  if (query.ids && query.ids.length > 0) {
    parts.push({ productId: { in: query.ids } });
  }

  if (query.search) {
    const term = query.search.trim();
    parts.push({
      OR: [
        { searchText: { contains: term, mode: "insensitive" } },
        { title: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (query.categorySlugs.length > 0) {
    const categoryIds = await resolveCategoryIds(query.categorySlugs, query.lang);
    if (categoryIds && categoryIds.length > 0) {
      parts.push({ categoryIds: { hasSome: categoryIds } });
    }
  }

  const brands = await resolveBrandIds(query.brands);
  if (brands.status === "empty") {
    return null;
  }
  if (brands.status === "ids") {
    parts.push({ brandId: { in: brands.ids } });
  }

  if (query.colors.length > 0 && query.sizes.length > 0) {
    parts.push({
      variantComboTokens: { hasSome: listingColorSizeComboTokens(query.colors, query.sizes) },
    });
  } else if (query.colors.length > 0) {
    parts.push({ colorTokens: { hasSome: query.colors } });
  } else if (query.sizes.length > 0) {
    parts.push({ sizeTokens: { hasSome: query.sizes } });
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const priceFilter: Prisma.FloatFilter = {};
    if (query.minPrice !== undefined) priceFilter.gte = query.minPrice;
    if (query.maxPrice !== undefined) priceFilter.lte = query.maxPrice;
    parts.push({ hasPrice: true, priceSort: priceFilter });
  }

  if (query.filter === "new") {
    parts.push({
      productCreatedAt: { gte: newArrivalSince() },
      hasMarcoListingImage: false,
    });
  }
  if (query.filter === "featured") {
    parts.push({ featured: true });
  }
  if (query.filter === "bestseller") {
    if (bestsellerProductIds.length === 0) {
      return null;
    }
    parts.push({ productId: { in: bestsellerProductIds } });
  }

  return { AND: parts };
}

export function listingRowOrderBy(
  query: CanonicalCatalogQuery,
): Prisma.ProductListingRowOrderByWithRelationInput[] {
  const marcoFirst: Prisma.ProductListingRowOrderByWithRelationInput = {
    hasMarcoListingImage: "asc",
  };
  if (query.sort === "price-asc") {
    return [marcoFirst, { hasPrice: "desc" }, { priceSort: "asc" }, { productId: "asc" }];
  }
  if (query.sort === "price-desc") {
    return [marcoFirst, { hasPrice: "desc" }, { priceSort: "desc" }, { productId: "asc" }];
  }
  if (query.sort === "name-asc") {
    return [marcoFirst, { title: "asc" }, { productId: "asc" }];
  }
  if (query.sort === "name-desc") {
    return [marcoFirst, { title: "desc" }, { productId: "asc" }];
  }
  return [marcoFirst, { productCreatedAt: "desc" }, { productId: "asc" }];
}
