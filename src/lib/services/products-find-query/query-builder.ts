import { Prisma } from "@white-shop/db";
import { db } from "@white-shop/db";
import type { ProductFilters } from "./types";
import { buildCategoryTreesOrWhere } from "./category-utils";

/**
 * Build search filter for where clause
 */
function buildSearchFilter(search: string): Prisma.ProductWhereInput {
  return {
    OR: [
      {
        translations: {
          some: {
            title: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
      },
      {
        translations: {
          some: {
            subtitle: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
      },
      {
        variants: {
          some: {
            sku: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
      },
    ],
  };
}

/**
 * Build category filter for where clause (supports comma-separated slugs).
 */
async function buildCategoryFilter(
  category: string,
  lang: string,
  existingWhere: Prisma.ProductWhereInput
): Promise<Prisma.ProductWhereInput | null> {
  const combined = await buildCategoryTreesOrWhere(category, lang);
  if (!combined) {
    return null;
  }

  if (existingWhere.OR) {
    return {
      AND: [{ OR: existingWhere.OR }, combined],
    };
  }

  return combined;
}

type BestsellerVariantRow = {
  variantId: string | null;
  _sum: { quantity: number | null };
};

/**
 * Product IDs ordered by total sold quantity (order items), most sold first.
 */
async function getBestsellerProductIdsRanked(): Promise<string[]> {
  const raw = await db.orderItem.groupBy({
    by: ["variantId"],
    _sum: { quantity: true },
    where: {
      variantId: {
        not: null,
      },
    },
    orderBy: {
      _sum: {
        quantity: "desc" as const,
      },
    },
    take: 200,
  });
  const bestsellerVariants = raw as BestsellerVariantRow[];

  const variantIds = bestsellerVariants
    .map((item) => item.variantId)
    .filter((id): id is string => Boolean(id));

  if (variantIds.length === 0) {
    return [];
  }

  const variantProductMap = await db.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, productId: true },
  });

  const variantToProduct = new Map<string, string>();
  variantProductMap.forEach(({ id, productId }: { id: string; productId: string }) => {
    variantToProduct.set(id, productId);
  });

  const productSales = new Map<string, number>();
  bestsellerVariants.forEach((item: BestsellerVariantRow) => {
    const variantId = item.variantId;
    if (!variantId) return;
    const productId = variantToProduct.get(variantId);
    if (!productId) return;
    const qty = item._sum?.quantity || 0;
    productSales.set(productId, (productSales.get(productId) || 0) + qty);
  });

  return Array.from(productSales.entries())
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .map(([productId]) => productId);
}

/**
 * Build filter for new, featured, bestseller
 */
async function buildFilterFilter(
  filter: string,
  existingWhere: Prisma.ProductWhereInput
): Promise<{
  where: Prisma.ProductWhereInput;
  bestsellerProductIds: string[];
}> {
  const bestsellerProductIds: string[] = [];

  if (filter === "new") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      where: {
        ...existingWhere,
        createdAt: { gte: thirtyDaysAgo },
      },
      bestsellerProductIds,
    };
  }

  if (filter === "featured") {
    return {
      where: {
        ...existingWhere,
        featured: true,
      },
      bestsellerProductIds,
    };
  }

  if (filter === "bestseller") {
    const ranked = await getBestsellerProductIdsRanked();
    bestsellerProductIds.push(...ranked);

    if (bestsellerProductIds.length > 0) {
      return {
        where: {
          ...existingWhere,
          id: {
            in: bestsellerProductIds,
          },
        },
        bestsellerProductIds,
      };
    }
  }

  return {
    where: existingWhere,
    bestsellerProductIds,
  };
}

/**
 * Build where clause for product query
 */
export async function buildWhereClause(
  filters: ProductFilters
): Promise<{
  where: Prisma.ProductWhereInput | null;
  bestsellerProductIds: string[];
}> {
  if (filters.ids && filters.ids.length > 0) {
    return {
      where: {
        published: true,
        deletedAt: null,
        id: { in: filters.ids },
      },
      bestsellerProductIds: [],
    };
  }

  const {
    category,
    search,
    filter,
    lang = "en",
    sort,
  } = filters;

  // Build base where clause
  let where: Prisma.ProductWhereInput = {
    published: true,
    deletedAt: null,
  };

  // Add search filter
  if (search && search.trim()) {
    const searchFilter = buildSearchFilter(search);
    where = { ...where, ...searchFilter };
  }

  // Add category filter
  if (category) {
    const categoryWhere = await buildCategoryFilter(category, lang, where);
    if (categoryWhere === null) {
      // Category not found - return empty result
      return {
        where: null,
        bestsellerProductIds: [],
      };
    }
    where = { ...where, ...categoryWhere };
  }

  // Add filter for new, featured, bestseller
  const filterResult = await buildFilterFilter(filter || "", where);
  where = filterResult.where;
  let bestsellerProductIds = [...filterResult.bestsellerProductIds];

  if (sort === "bestseller" && filter !== "bestseller") {
    bestsellerProductIds = await getBestsellerProductIdsRanked();
  }

  return {
    where,
    bestsellerProductIds,
  };
}

