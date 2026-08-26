import { revalidatePath } from "next/cache";
import { logger } from "../../../utils/logger";
import { syncProductListingReadModel } from "@/lib/read-model/product-read-model-sync";
import { invalidateCategoryCaches } from "@/lib/services/read-through-json-cache";

/**
 * Sync read models, drop Redis, and revalidate public paths after a product write.
 */
export async function revalidateProductCache(
  productId: string,
  productSlug: string | undefined,
) {
  try {
    await syncProductListingReadModel(productId);
    if (productSlug) {
      revalidatePath(`/products/${productSlug}`);
    }
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/products");
    await invalidateCategoryCaches();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn("Revalidation failed (expected in some environments)", { error: errorMessage });
  }
}
