import { updateProduct } from "./admin-products-update/product-update-operations";
import { revalidateProductCache } from "./admin-products-update/cache-revalidator";
import type { AdminProductUpdateInput } from "@/lib/schemas/admin-product-update.schema";
import type { ProductUpdateResult } from "./admin-products-update/types";

/**
 * Service for admin product update operations
 */
class AdminProductsUpdateService {
  /**
   * Update product — returns lightweight success payload.
   */
  async updateProduct(
    productId: string,
    data: AdminProductUpdateInput
  ): Promise<Pick<ProductUpdateResult, "success" | "id" | "updatedAt">> {
    const result = await updateProduct(productId, data);

    if (result.didUpdate) {
      revalidateProductCache(productId, result.productSlug);
    }

    return {
      success: true,
      id: result.id,
      updatedAt: result.updatedAt,
    };
  }
}

export const adminProductsUpdateService = new AdminProductsUpdateService();
