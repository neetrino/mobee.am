import { revalidatePath, revalidateTag } from "next/cache";
import { logger } from "../../../utils/logger";
import { cacheService } from "../../cache.service";

/**
 * Revalidate cache for product and related pages
 */
export async function revalidateProductCache(
  productId: string,
  productSlug: string | undefined
) {
  try {
    logger.debug('Revalidating paths for product', { productId });
    if (productSlug) {
      revalidatePath(`/products/${productSlug}`);
    }
    revalidatePath('/');
    revalidatePath('/products');
    // @ts-expect-error - revalidateTag type issue in Next.js
    revalidateTag('products');
    // @ts-expect-error - revalidateTag type issue in Next.js
    revalidateTag(`product-${productId}`);

    await cacheService.deletePattern('products:*');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Revalidation failed (expected in some environments)', { error: errorMessage });
  }
}




