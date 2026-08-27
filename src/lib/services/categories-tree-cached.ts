import { unstable_cache } from "next/cache";
import { categoriesService } from "@/lib/services/categories.service";
import { getCachedJson } from "@/lib/services/read-through-json-cache";
import { CATEGORIES_CACHE_TTL_SEC } from "@/lib/cache/public-cache-keys";
import type { CategoryTreeNode } from "@/lib/category-nav";

export type CategoriesTreePayload = {
  data: CategoryTreeNode[];
};

export const CATEGORIES_TREE_CACHE_TAG = "categories-tree";

/**
 * Cached category tree. Cache failures fail-open to DB; DB failures propagate.
 */
export async function getCachedCategoriesTree(
  lang: string,
): Promise<{ result: CategoriesTreePayload; cacheStatus: "HIT" | "MISS" }> {
  const cacheKey = `cache:categories:tree:v2:${lang}`;
  return getCachedJson<CategoriesTreePayload>(
    cacheKey,
    CATEGORIES_CACHE_TTL_SEC,
    () => categoriesService.getTree(lang),
  );
}

/**
 * Layout/RSC tree: Next Data Cache only — no Upstash fetch, so the root layout stays static.
 */
export const getLayoutCategoriesTree = unstable_cache(
  async (lang: string) => categoriesService.getTree(lang),
  ["layout-categories-tree-v2"],
  { revalidate: 300, tags: [CATEGORIES_TREE_CACHE_TAG] },
);
