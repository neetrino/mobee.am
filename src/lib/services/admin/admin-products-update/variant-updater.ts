import { Prisma } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import {
  processVariantOptions,
  parsePartialVariantFields,
} from "./variant-processor";
import { applyLegacyVariantReplace } from "./variant-legacy-updater";
import { createVariant } from "./variant-create";
import {
  ownershipError,
  notFoundError,
  processVariantImageUrl,
} from "./variant-helpers";
import type { UpdateVariantInput, VariantsUpdateOps } from "./types";

/**
 * Partial update of an existing variant by id with ownership check.
 * Options are replaced only when `options` is present on the input.
 */
export async function updateVariantPartial(
  variant: UpdateVariantInput,
  productId: string,
  locale: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const existing = await tx.productVariant.findUnique({
    where: { id: variant.id },
    select: { id: true, productId: true },
  });

  if (!existing) {
    notFoundError(variant.id);
  }
  if (existing.productId !== productId) {
    ownershipError(variant.id);
  }

  const fields = parsePartialVariantFields(variant);
  const data: Prisma.ProductVariantUpdateInput = {};

  if (variant.sku !== undefined) {
    data.sku = variant.sku.trim();
  }
  if (fields.price !== undefined) {
    data.price = fields.price;
  }
  if (fields.stock !== undefined) {
    data.stock = fields.stock;
  }
  if (fields.hasCompareAtPrice) {
    data.compareAtPrice = fields.compareAtPrice;
  }
  if (variant.published !== undefined) {
    data.published = variant.published;
  }
  if (variant.imageUrl !== undefined) {
    data.imageUrl = processVariantImageUrl(variant.imageUrl);
  }

  if (variant.options !== undefined) {
    const { options, attributesMap } = await processVariantOptions(
      { options: variant.options },
      locale,
      tx
    );
    const attributesJson =
      Object.keys(attributesMap).length > 0 ? attributesMap : null;

    await tx.productVariantOption.deleteMany({
      where: { variantId: variant.id },
    });

    data.attributes = (attributesJson || undefined) as
      | Prisma.InputJsonValue
      | undefined;
    data.options = { create: options };
  }

  await tx.productVariant.update({
    where: { id: variant.id },
    data,
  });

  logger.info("Updated variant (partial)", { variantId: variant.id });
}

/**
 * Delete variants by id, scoped to product ownership.
 */
export async function deleteVariants(
  deleteIds: string[],
  productId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  if (deleteIds.length === 0) {
    return;
  }

  const owned = await tx.productVariant.findMany({
    where: { id: { in: deleteIds }, productId },
    select: { id: true },
  });
  const ownedIds = owned.map((v) => v.id);

  if (ownedIds.length === 0) {
    return;
  }

  await tx.productVariant.deleteMany({
    where: {
      id: { in: ownedIds },
      productId,
    },
  });
  logger.info(`Deleted ${ownedIds.length} variant(s)`, { variantIds: ownedIds });
}

/**
 * Apply differential + legacy variant operations.
 */
export async function applyVariantOperations(
  variants: VariantsUpdateOps,
  productId: string,
  locale: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  if (variants.legacyReplace !== undefined) {
    await applyLegacyVariantReplace(
      variants.legacyReplace,
      productId,
      locale,
      tx
    );
    return;
  }

  if (variants.deleteIds && variants.deleteIds.length > 0) {
    await deleteVariants(variants.deleteIds, productId, tx);
  }

  if (variants.update && variants.update.length > 0) {
    for (const variant of variants.update) {
      await updateVariantPartial(variant, productId, locale, tx);
    }
  }

  if (variants.create && variants.create.length > 0) {
    for (const variant of variants.create) {
      await createVariant(variant, productId, locale, tx);
    }
  }
}

export { createVariant };
