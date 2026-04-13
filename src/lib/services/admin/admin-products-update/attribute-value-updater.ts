import { Prisma } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { processImageUrl, smartSplitUrls } from "../../../utils/image-utils";

/**
 * Update attribute value imageUrls from variant images
 */
export async function updateAttributeValueImageUrls(
  productId: string,
  tx: Prisma.TransactionClient
) {
  try {
    logger.debug('Updating attribute value imageUrls from variant images...');
    const allVariants = await tx.productVariant.findMany({
      where: { productId },
      include: {
        options: {
          include: {
            attributeValue: true,
          },
        },
      },
    });

    for (const variant of allVariants) {
      if (!variant.imageUrl) continue;

      // Use smartSplitUrls to properly handle comma-separated URLs and base64 images
      const variantImageUrls = smartSplitUrls(variant.imageUrl);
      if (variantImageUrls.length === 0) continue;

      // Process and validate first image URL
      const firstVariantImageUrl = processImageUrl(variantImageUrls[0]);
      if (!firstVariantImageUrl) {
        logger.debug(`Variant ${variant.id} has invalid imageUrl, skipping attribute value update`);
        continue;
      }

      // Get all attribute value IDs from this variant's options
      const attributeValueIds = new Set<string>();
      variant.options.forEach((opt) => {
        if (opt.valueId && opt.attributeValue) {
          attributeValueIds.add(opt.valueId);
        }
      });

      // Update each attribute value's imageUrl if it doesn't already have one
      for (const valueId of attributeValueIds) {
        const attrValue = await tx.attributeValue.findUnique({
          where: { id: valueId },
          include: {
            attribute: true,
          },
        });

        if (attrValue) {
          // Check if attribute is "color"
          const isColorAttribute = attrValue.attribute?.key === "color";
          
          // Check if attribute value only has colors but no imageUrl
          const hasColors = attrValue.colors && 
            (Array.isArray(attrValue.colors) ? attrValue.colors.length > 0 : 
             typeof attrValue.colors === 'string' ? attrValue.colors.trim() !== '' && attrValue.colors !== '[]' : 
             Object.keys(attrValue.colors || {}).length > 0);
          const hasNoImageUrl = !attrValue.imageUrl || attrValue.imageUrl.trim() === '';
          const isColorOnly = hasColors && hasNoImageUrl;

          // Skip updating if:
          // 1. It's a color attribute AND doesn't have an imageUrl, OR
          // 2. It only has colors but no imageUrl
          if ((isColorAttribute && hasNoImageUrl) || isColorOnly) {
            logger.debug(`Skipping attribute value ${valueId} - color attribute or color-only value without imageUrl`);
            continue;
          }

          // Only update if:
          // 1. Attribute value doesn't have an imageUrl, OR
          // 2. Variant image is a base64 (more specific) and attribute value has a URL
          const shouldUpdate = !attrValue.imageUrl || 
            (firstVariantImageUrl.startsWith('data:image/') && attrValue.imageUrl && !attrValue.imageUrl.startsWith('data:image/'));

          if (shouldUpdate) {
            logger.debug(`Updating attribute value ${valueId} imageUrl from variant ${variant.id}`, { 
              imageUrl: firstVariantImageUrl.substring(0, 50) + '...' 
            });
            await tx.attributeValue.update({
              where: { id: valueId },
              data: { imageUrl: firstVariantImageUrl },
            });
          } else {
            logger.debug(`Skipping attribute value ${valueId} - already has imageUrl`);
          }
        }
      }
    }
    logger.info('Finished updating attribute value imageUrls from variant images');
  } catch (error: unknown) {
    // Don't fail the transaction if this fails - it's a nice-to-have feature
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to update attribute value imageUrls from variant images', { error: errorMessage });
  }
}




