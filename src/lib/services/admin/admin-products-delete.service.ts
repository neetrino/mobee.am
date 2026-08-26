import { db } from "@white-shop/db";
import { deleteProductListingReadModel } from "@/lib/read-model/product-read-model-sync";
import { syncProductListingReadModel } from "@/lib/read-model/product-read-model-sync";
import { logger } from "@/lib/utils/logger";

async function syncProductSafely(action: string, productId: string, mode: "delete" | "update"): Promise<void> {
  try {
    if (mode === "delete") {
      await deleteProductListingReadModel(productId);
      return;
    }
    await syncProductListingReadModel(productId);
  } catch (error: unknown) {
    logger.warn("Catalog cache invalidation failed after successful mutation", {
      action,
      productId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

class AdminProductsDeleteService {
  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId: string) {
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Product not found",
        detail: `Product with id '${productId}' does not exist`,
      };
    }

    await db.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        published: false,
      },
    });

    await syncProductSafely("deleteProduct", productId, "delete");
    return { success: true };
  }

  /**
   * Update product discount
   */
  async updateProductDiscount(productId: string, discountPercent: number) {
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Product not found",
        detail: `Product with id '${productId}' does not exist`,
      };
    }

    const clampedDiscount = Math.max(0, Math.min(100, discountPercent));
    const updated = await db.product.update({
      where: { id: productId },
      data: {
        discountPercent: clampedDiscount,
      },
    });

    await syncProductSafely("updateProductDiscount", productId, "update");
    return { success: true, discountPercent: updated.discountPercent };
  }
}

export const adminProductsDeleteService = new AdminProductsDeleteService();
