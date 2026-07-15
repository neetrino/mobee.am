import { db } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import { processImageUrl, smartSplitUrls } from "../../../utils/image-utils";

/**
 * Update attribute value imageUrls from variant images.
 * Must run AFTER transaction commit. Errors are logged and never thrown.
 */
export async function updateAttributeValueImageUrls(
  productId: string
): Promise<void> {
  try {
    logger.debug("Updating attribute value imageUrls from variant images...");
    const allVariants = await db.productVariant.findMany({
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
      if (!variant.imageUrl) {
        continue;
      }

      const variantImageUrls = smartSplitUrls(variant.imageUrl);
      if (variantImageUrls.length === 0) {
        continue;
      }

      const firstVariantImageUrl = processImageUrl(variantImageUrls[0]);
      if (!firstVariantImageUrl) {
        logger.debug(
          `Variant ${variant.id} has invalid imageUrl, skipping attribute value update`
        );
        continue;
      }

      const attributeValueIds = new Set<string>();
      variant.options.forEach((opt) => {
        if (opt.valueId && opt.attributeValue) {
          attributeValueIds.add(opt.valueId);
        }
      });

      for (const valueId of attributeValueIds) {
        const attrValue = await db.attributeValue.findUnique({
          where: { id: valueId },
          include: {
            attribute: true,
          },
        });

        if (!attrValue) {
          continue;
        }

        const isColorAttribute = attrValue.attribute?.key === "color";
        const hasColors =
          attrValue.colors &&
          (Array.isArray(attrValue.colors)
            ? attrValue.colors.length > 0
            : typeof attrValue.colors === "string"
              ? attrValue.colors.trim() !== "" && attrValue.colors !== "[]"
              : Object.keys(attrValue.colors || {}).length > 0);
        const hasNoImageUrl =
          !attrValue.imageUrl || attrValue.imageUrl.trim() === "";
        const isColorOnly = hasColors && hasNoImageUrl;

        if ((isColorAttribute && hasNoImageUrl) || isColorOnly) {
          logger.debug(
            `Skipping attribute value ${valueId} - color attribute or color-only value without imageUrl`
          );
          continue;
        }

        const shouldUpdate =
          !attrValue.imageUrl ||
          (firstVariantImageUrl.startsWith("data:image/") &&
            attrValue.imageUrl &&
            !attrValue.imageUrl.startsWith("data:image/"));

        if (shouldUpdate) {
          logger.debug(
            `Updating attribute value ${valueId} imageUrl from variant ${variant.id}`,
            { imageUrl: firstVariantImageUrl.substring(0, 50) + "..." }
          );
          await db.attributeValue.update({
            where: { id: valueId },
            data: { imageUrl: firstVariantImageUrl },
          });
        } else {
          logger.debug(
            `Skipping attribute value ${valueId} - already has imageUrl`
          );
        }
      }
    }
    logger.info(
      "Finished updating attribute value imageUrls from variant images"
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(
      "Failed to update attribute value imageUrls from variant images",
      { error: errorMessage }
    );
  }
}
