import { Prisma } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import {
  processVariantOptions,
  parseVariantPrices,
} from "./variant-processor";
import { processVariantImageUrl } from "./variant-helpers";
import type { CreateVariantInput } from "./types";

/**
 * Create a new variant for the product.
 */
export async function createVariant(
  variant: CreateVariantInput,
  productId: string,
  locale: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  if (variant.sku) {
    const skuValue = variant.sku.trim();
    const existingSkuCheck = await tx.productVariant.findFirst({
      where: { sku: skuValue },
    });
    if (existingSkuCheck) {
      throw new Error(
        `SKU "${skuValue}" already exists. Cannot create duplicate variant.`
      );
    }
  }

  const { options, attributesMap } = await processVariantOptions(
    variant,
    locale,
    tx
  );
  const { price, stock, compareAtPrice } = parseVariantPrices(variant);
  const attributesJson =
    Object.keys(attributesMap).length > 0 ? attributesMap : null;
  const processedVariantImageUrl = processVariantImageUrl(variant.imageUrl);

  const newVariant = await tx.productVariant.create({
    data: {
      productId,
      sku: variant.sku ? variant.sku.trim() : undefined,
      price,
      compareAtPrice,
      stock: isNaN(stock) ? 0 : stock,
      imageUrl: processedVariantImageUrl ?? undefined,
      published: variant.published !== false,
      attributes: (attributesJson || undefined) as
        | Prisma.InputJsonValue
        | undefined,
      options: {
        create: options,
      },
    },
  });

  logger.info("Created new variant", { variantId: newVariant.id });
  return newVariant.id;
}
