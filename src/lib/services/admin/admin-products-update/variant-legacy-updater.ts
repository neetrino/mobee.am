import { Prisma } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import { processImageUrl, smartSplitUrls } from "../../../utils/image-utils";
import {
  processVariantOptions,
  parseVariantPrices,
} from "./variant-processor";
import type { LegacyVariantInput } from "./types";
import { createVariant } from "./variant-create";
import { ownershipError, processVariantImageUrl } from "./variant-helpers";

/**
 * Legacy full-list replace: match by id or SKU, create missing, delete omitted.
 */
export async function applyLegacyVariantReplace(
  variants: LegacyVariantInput[],
  productId: string,
  locale: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const existingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true, sku: true },
  });
  const existingVariantIds = new Set(existingVariants.map((v) => v.id));
  const existingSkuMap = new Map<string, string>();
  existingVariants.forEach((v) => {
    if (v.sku) {
      existingSkuMap.set(v.sku.trim().toLowerCase(), v.id);
    }
  });

  const incomingVariantIds = new Set<string>();

  for (const variant of variants) {
    const variantId = await updateOrCreateLegacyVariant(
      variant,
      productId,
      locale,
      existingVariantIds,
      existingSkuMap,
      tx
    );
    incomingVariantIds.add(variantId);
  }

  const variantsToDelete = Array.from(existingVariantIds).filter(
    (id) => !incomingVariantIds.has(id)
  );
  if (variantsToDelete.length > 0) {
    await tx.productVariant.deleteMany({
      where: {
        id: { in: variantsToDelete },
        productId,
      },
    });
    logger.info(`Deleted ${variantsToDelete.length} variant(s)`, {
      variantIds: variantsToDelete,
    });
  }
}

async function updateOrCreateLegacyVariant(
  variant: LegacyVariantInput,
  productId: string,
  locale: string,
  existingVariantIds: Set<string>,
  existingSkuMap: Map<string, string>,
  tx: Prisma.TransactionClient
): Promise<string> {
  const { options, attributesMap } = await processVariantOptions(
    variant,
    locale,
    tx
  );
  const { price, stock, compareAtPrice } = parseVariantPrices(variant);
  const attributesJson =
    Object.keys(attributesMap).length > 0 ? attributesMap : null;

  let variantIdToUse: string | null = null;

  if (variant.id && existingVariantIds.has(variant.id)) {
    variantIdToUse = variant.id;
  } else if (variant.id) {
    // Reject cross-product IDs; unknown/temp client IDs fall through to SKU/create.
    const crossProduct = await tx.productVariant.findUnique({
      where: { id: variant.id },
      select: { productId: true },
    });
    if (crossProduct && crossProduct.productId !== productId) {
      ownershipError(variant.id);
    }
    if (crossProduct) {
      variantIdToUse = variant.id;
    }
  }

  if (!variantIdToUse && variant.sku) {
    const skuKey = variant.sku.trim().toLowerCase();
    const matchedId = existingSkuMap.get(skuKey);
    if (matchedId) {
      variantIdToUse = matchedId;
    } else {
      const existingSkuVariant = await tx.productVariant.findFirst({
        where: { sku: variant.sku.trim() },
      });
      if (existingSkuVariant) {
        throw new Error(
          `SKU "${variant.sku.trim()}" already exists in another product. Please use a unique SKU.`
        );
      }
    }
  }

  const processedImageUrl = processVariantImageUrl(variant.imageUrl);

  if (variantIdToUse) {
    await tx.productVariantOption.deleteMany({
      where: { variantId: variantIdToUse },
    });
    await tx.productVariant.update({
      where: { id: variantIdToUse },
      data: {
        sku: variant.sku ? variant.sku.trim() : undefined,
        price,
        compareAtPrice,
        stock: isNaN(stock) ? 0 : stock,
        imageUrl: processedImageUrl ?? undefined,
        published: variant.published !== false,
        attributes: (attributesJson || undefined) as
          | Prisma.InputJsonValue
          | undefined,
        options: { create: options },
      },
    });
    logger.info("Updated variant (legacy)", { variantId: variantIdToUse });
    return variantIdToUse;
  }

  return createVariant(
    {
      sku: variant.sku,
      price,
      compareAtPrice,
      stock,
      published: variant.published,
      imageUrl: variant.imageUrl,
      options: variant.options,
      color: variant.color,
      size: variant.size,
    },
    productId,
    locale,
    tx
  );
}
