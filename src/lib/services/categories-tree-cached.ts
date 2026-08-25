import { categoriesService } from "@/lib/services/categories.service";
import { cacheService } from "@/lib/services/cache.service";
import { logger } from "@/lib/utils/logger";
import type { CategoryTreeNode } from "@/lib/category-nav";

const CACHE_TTL_SECONDS = 300;

export type CategoriesTreePayload = {
  data: CategoryTreeNode[];
};

function parseTreePayload(cached: string | unknown): CategoriesTreePayload | null {
  try {
    const data = typeof cached === "string" ? JSON.parse(cached) : cached;
    if (!data || typeof data !== "object" || !Array.isArray((data as CategoriesTreePayload).data)) {
      return null;
    }
    return data as CategoriesTreePayload;
  } catch {
    return null;
  }
}

/**
 * Cached category tree. Cache failures fail-open to DB; DB failures propagate.
 */
export async function getCachedCategoriesTree(
  lang: string,
): Promise<{ result: CategoriesTreePayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = `categories:tree:v2:${lang}`;
  let cached: CategoriesTreePayload | null = null;
  try {
    cached = parseTreePayload(await cacheService.get(cacheKey));
  } catch (error: unknown) {
    logger.warn("Category tree cache read failed; falling back to database", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  if (cached) {
    return { result: cached, cacheStatus: "HIT" };
  }

  const result = await categoriesService.getTree(lang);
  try {
    await cacheService.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result));
  } catch (error: unknown) {
    logger.warn("Category tree cache write failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return { result, cacheStatus: "MISS" };
}
