import { db } from "@white-shop/db";

function incrementCategoryCount(countMap: Map<string, number>, categoryId: string): void {
  countMap.set(categoryId, (countMap.get(categoryId) ?? 0) + 1);
}

/**
 * Counts non-deleted products per category (primary or secondary assignment).
 */
export async function getCategoryProductCountMap(
  categoryIds: string[],
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();

  if (categoryIds.length === 0) {
    return countMap;
  }

  const categoryIdSet = new Set(categoryIds);

  const products = await db.product.findMany({
    where: {
      deletedAt: null,
      OR: [
        { primaryCategoryId: { in: categoryIds } },
        { categoryIds: { hasSome: categoryIds } },
      ],
    },
    select: {
      primaryCategoryId: true,
      categoryIds: true,
    },
  });

  for (const product of products) {
    const productCategoryIds = new Set<string>();

    if (product.primaryCategoryId && categoryIdSet.has(product.primaryCategoryId)) {
      productCategoryIds.add(product.primaryCategoryId);
    }

    for (const categoryId of product.categoryIds) {
      if (categoryIdSet.has(categoryId)) {
        productCategoryIds.add(categoryId);
      }
    }

    for (const categoryId of productCategoryIds) {
      incrementCategoryCount(countMap, categoryId);
    }
  }

  return countMap;
}
