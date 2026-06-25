import { db } from "@white-shop/db";
import { logAdminCategoryCountsPerf } from "@/lib/admin/admin-perf-log";

interface CategoryCountRow {
  categoryId: string;
  count: number;
}

/**
 * Counts non-deleted products per category (primary or secondary assignment).
 * Uses SQL aggregation instead of loading all products into Node.js.
 */
export async function getCategoryProductCountMap(
  categoryIds: string[],
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();

  if (categoryIds.length === 0) {
    return countMap;
  }

  const startedAt = Date.now();

  const rows = await db.$queryRaw<CategoryCountRow[]>`
    WITH product_category_links AS (
      SELECT p.id AS product_id, p."primaryCategoryId" AS category_id
      FROM products p
      WHERE p."deletedAt" IS NULL
        AND p."primaryCategoryId" IS NOT NULL

      UNION

      SELECT p.id AS product_id, unnest(p."categoryIds") AS category_id
      FROM products p
      WHERE p."deletedAt" IS NULL
    )
    SELECT
      pcl.category_id AS "categoryId",
      COUNT(DISTINCT pcl.product_id)::int AS count
    FROM product_category_links pcl
    WHERE pcl.category_id = ANY(${categoryIds}::text[])
    GROUP BY pcl.category_id
  `;

  logAdminCategoryCountsPerf({
    totalMs: Date.now() - startedAt,
    categories: categoryIds.length,
    rows: rows.length,
  });

  for (const row of rows) {
    countMap.set(row.categoryId, row.count);
  }

  return countMap;
}
