import { db } from "@white-shop/db";
import { Prisma } from "@prisma/client";
import { logger } from "../../../utils/logger";
import type { UpdateProductData } from "./types";
import { collectVariantImages, buildProductUpdateData, updateProductTranslation, updateProductLabels, updateProductAttributes } from "./product-updater";
import { updateOrCreateVariant } from "./variant-updater";
import { updateAttributeValueImageUrls } from "./attribute-value-updater";

/**
 * Update product
 */
export async function updateProduct(
  productId: string,
  data: UpdateProductData
) {
  try {
    logger.info('Updating product', { productId });
    
    // Check if product exists
    const existing = await db.product.findUnique({
      where: { id: productId },
      include: {
        translations: true,
      }
    });

    if (!existing) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Product not found",
        detail: `Product with id '${productId}' does not exist`,
      };
    }

    // Execute everything in a transaction for atomicity and speed
    const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Collect all variant images to exclude from main media (if media is being updated)
      const allVariantImages = await collectVariantImages(data.variants, productId, tx);

      // 1. Update product base data
      const updateData = buildProductUpdateData(data, allVariantImages, existing);

      // 2. Update translation
      await updateProductTranslation(productId, data, tx);

      // 3. Update labels
      await updateProductLabels(productId, data.labels, tx);

      // 3.5. Update ProductAttribute relations
      await updateProductAttributes(productId, data.attributeIds, tx);

      // 4. Update variants
      if (data.variants !== undefined) {
        // Get existing variants with their IDs and SKUs for matching
        const existingVariants = await tx.productVariant.findMany({
          where: { productId },
          select: { id: true, sku: true },
        });
        const existingVariantIds = new Set<string>(existingVariants.map((v: { id: string }) => v.id));
        // Create a map of SKU -> variant ID for quick lookup
        const existingSkuMap = new Map<string, string>();
        existingVariants.forEach((v: { id: string; sku: string | null }) => {
          if (v.sku) {
            existingSkuMap.set(v.sku.trim().toLowerCase(), v.id);
          }
        });
        const incomingVariantIds = new Set<string>();
        
        const locale = data.locale || "en";
        
        // Process each variant: update if exists, create if new
        if (data.variants.length > 0) {
          for (const variant of data.variants) {
            const variantId = await updateOrCreateVariant(
              variant,
              productId,
              locale,
              existingVariantIds,
              existingSkuMap,
              tx
            );
            incomingVariantIds.add(variantId);
          }
        }
        
        // Delete variants that are no longer in the list
        const variantsToDelete = Array.from(existingVariantIds).filter(id => !incomingVariantIds.has(id));
        if (variantsToDelete.length > 0) {
          await tx.productVariant.deleteMany({
            where: {
              id: { in: variantsToDelete },
              productId,
            },
          });
          logger.info(`Deleted ${variantsToDelete.length} variant(s)`, { variantIds: variantsToDelete });
        }
      }

      // Update attribute value imageUrls from variant images
      await updateAttributeValueImageUrls(productId, tx);

      // 5. Finally update the product record itself
      return await tx.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          translations: true,
          variants: {
            include: {
              options: true,
            },
          },
          labels: true,
        },
      });
    });

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("updateProduct error", { error: errorMessage });
    throw error;
  }
}




