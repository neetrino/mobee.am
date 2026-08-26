import { revalidateTag } from "next/cache";
import { invalidateCatalogReadCaches } from "@/lib/services/read-through-json-cache";
import { CATEGORIES_TREE_CACHE_TAG } from "@/lib/services/categories-tree-cached";

/**
 * Drop list/facet/PDP/category caches after catalog-affecting writes.
 */
export async function invalidateCatalogCaches(): Promise<void> {
  await invalidateCatalogReadCaches();
  revalidateTag(CATEGORIES_TREE_CACHE_TAG, "max");
}
