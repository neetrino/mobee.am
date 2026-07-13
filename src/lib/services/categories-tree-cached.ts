import { categoriesService } from "@/lib/services/categories.service";
import { cacheService } from "@/lib/services/cache.service";
import type { CategoryTreeNode } from "@/lib/category-nav";

const CACHE_TTL_SECONDS = 300;

export type CategoriesTreePayload = {
  data: CategoryTreeNode[];
};

function isDatabaseConfigurationError(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    detail.includes("Error validating datasource `db`") ||
    detail.includes("env(\"DATABASE_URL\")") ||
    detail.includes("P1001") ||
    detail.includes("Can't reach database server")
  );
}

/**
 * Cached category tree — shared by GET /api/v1/categories/tree and root layout RSC.
 */
export async function getCachedCategoriesTree(
  lang: string,
): Promise<{ result: CategoriesTreePayload; cacheStatus: "HIT" | "MISS" | "BYPASS" }> {
  const cacheKey = `categories:tree:v2:${lang}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null && cached !== undefined) {
    const data =
      typeof cached === "string"
        ? (JSON.parse(cached) as CategoriesTreePayload)
        : (cached as CategoriesTreePayload);
    return { result: data, cacheStatus: "HIT" };
  }

  try {
    const result = await categoriesService.getTree(lang);
    await cacheService.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
    return { result, cacheStatus: "MISS" };
  } catch (error: unknown) {
    if (!isDatabaseConfigurationError(error)) {
      throw error;
    }
    return { result: { data: [] }, cacheStatus: "BYPASS" };
  }
}
