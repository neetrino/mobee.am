import { Prisma } from "@white-shop/db";
import { normalizeProductWarrantyYears } from "@/lib/constants/product-warranty";
import { logger } from "../../../utils/logger";
import {
  cleanImageUrls,
  separateMainAndVariantImages,
  smartSplitUrls,
} from "../../../utils/image-utils";
import type {
  LabelsUpdateOps,
  AttributesUpdateOps,
  MediaUpdateOps,
  NormalizedProductUpdate,
} from "./types";

/**
 * Collect variant images from incoming ops or existing DB variants.
 */
export async function collectVariantImages(
  variants: NormalizedProductUpdate["variants"],
  productId: string,
  tx: Prisma.TransactionClient
): Promise<string[]> {
  const allVariantImages: string[] = [];

  const pushImage = (imageUrl: string | null | undefined) => {
    if (!imageUrl) {
      return;
    }
    allVariantImages.push(...smartSplitUrls(imageUrl));
  };

  if (variants === undefined) {
    const existingVariants = await tx.productVariant.findMany({
      where: { productId },
      select: { imageUrl: true },
    });
    existingVariants.forEach((variant) => pushImage(variant.imageUrl));
    return allVariantImages;
  }

  if (variants.legacyReplace) {
    variants.legacyReplace.forEach((variant) => pushImage(variant.imageUrl));
    return allVariantImages;
  }

  (variants.create ?? []).forEach((variant) => pushImage(variant.imageUrl));

  const deleteIds = new Set(variants.deleteIds ?? []);
  const updateImageById = new Map(
    (variants.update ?? [])
      .filter((variant) => variant.imageUrl !== undefined)
      .map((variant) => [variant.id, variant.imageUrl])
  );

  const existingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true, imageUrl: true },
  });

  existingVariants.forEach((variant) => {
    if (deleteIds.has(variant.id)) {
      return;
    }
    if (updateImageById.has(variant.id)) {
      pushImage(updateImageById.get(variant.id));
      return;
    }
    pushImage(variant.imageUrl);
  });

  return allVariantImages;
}

/**
 * Build Prisma product scalar update from product + media sections.
 */
export function buildProductUpdateData(
  ops: NormalizedProductUpdate,
  allVariantImages: string[],
  existing: { publishedAt: Date | null }
): {
  brandId?: string | null;
  primaryCategoryId?: string | null;
  categoryIds?: string[];
  media?: string[];
  published?: boolean;
  publishedAt?: Date;
  featured?: boolean;
  warrantyYears?: number | null;
  updatedAt?: Date;
} {
  const updateData: {
    brandId?: string | null;
    primaryCategoryId?: string | null;
    categoryIds?: string[];
    media?: string[];
    published?: boolean;
    publishedAt?: Date;
    featured?: boolean;
    warrantyYears?: number | null;
    updatedAt?: Date;
  } = {};

  const product = ops.product;
  if (product) {
    if (product.brandId !== undefined) {
      updateData.brandId = product.brandId;
    }
    if (product.primaryCategoryId !== undefined) {
      updateData.primaryCategoryId = product.primaryCategoryId;
    }
    if (product.categoryIds !== undefined) {
      updateData.categoryIds = product.categoryIds;
    }
    if (product.published !== undefined) {
      updateData.published = product.published;
      if (product.published && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (product.featured !== undefined) {
      updateData.featured = product.featured;
    }
    if (product.warrantyYears !== undefined) {
      updateData.warrantyYears = normalizeProductWarrantyYears(product.warrantyYears);
    }
  }

  if (ops.media?.replace !== undefined) {
    const { main } = separateMainAndVariantImages(
      ops.media.replace as MediaUpdateOps["replace"] &
        Array<string | { url?: string; src?: string; value?: string }>,
      allVariantImages
    );
    updateData.media = cleanImageUrls(main);
    logger.debug("Updated main media", {
      count: updateData.media.length,
      variantImagesExcluded: allVariantImages.length,
    });
  }

  updateData.updatedAt = new Date();
  return updateData;
}

/**
 * Update product translation when basic section is present.
 */
export async function updateProductTranslation(
  productId: string,
  ops: NormalizedProductUpdate,
  tx: Prisma.TransactionClient
): Promise<void> {
  const basic = ops.basic;
  if (!basic) {
    return;
  }

  const hasField =
    basic.title !== undefined ||
    basic.slug !== undefined ||
    basic.subtitle !== undefined ||
    basic.descriptionHtml !== undefined;

  if (!hasField) {
    return;
  }

  const locale = ops.locale || "en";
  await tx.productTranslation.upsert({
    where: {
      productId_locale: {
        productId,
        locale,
      },
    },
    update: {
      ...(basic.title !== undefined && { title: basic.title }),
      ...(basic.slug !== undefined && { slug: basic.slug }),
      ...(basic.subtitle !== undefined && { subtitle: basic.subtitle }),
      ...(basic.descriptionHtml !== undefined && {
        descriptionHtml: basic.descriptionHtml,
      }),
    },
    create: {
      productId,
      locale,
      title: basic.title || "",
      slug: basic.slug || "",
      subtitle: basic.subtitle ?? null,
      descriptionHtml: basic.descriptionHtml ?? null,
    },
  });
}

/**
 * Differential or replace-style label updates. Ownership: productId scoped.
 */
export async function updateProductLabels(
  productId: string,
  labels: LabelsUpdateOps | undefined,
  tx: Prisma.TransactionClient
): Promise<void> {
  if (!labels) {
    return;
  }

  if (labels.replace !== undefined) {
    await tx.productLabel.deleteMany({ where: { productId } });
    if (labels.replace.length > 0) {
      await tx.productLabel.createMany({
        data: labels.replace.map((label) => ({
          productId,
          type: label.type,
          value: label.value,
          position: label.position,
          color: label.color || undefined,
        })),
      });
    }
    return;
  }

  if (labels.removeIds && labels.removeIds.length > 0) {
    await tx.productLabel.deleteMany({
      where: {
        id: { in: labels.removeIds },
        productId,
      },
    });
  }

  if (labels.update && labels.update.length > 0) {
    for (const label of labels.update) {
      if (!label.id) {
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Invalid label update",
          detail: "Label update requires id",
        };
      }
      const result = await tx.productLabel.updateMany({
        where: { id: label.id, productId },
        data: {
          type: label.type,
          value: label.value,
          position: label.position,
          color: label.color ?? undefined,
        },
      });
      if (result.count === 0) {
        throw {
          status: 404,
          type: "https://api.shop.am/problems/not-found",
          title: "Label not found",
          detail: `Label '${label.id}' does not belong to this product`,
        };
      }
    }
  }

  if (labels.add && labels.add.length > 0) {
    await tx.productLabel.createMany({
      data: labels.add.map((label) => ({
        productId,
        type: label.type,
        value: label.value,
        position: label.position,
        color: label.color || undefined,
      })),
    });
  }
}

/**
 * Differential or replace-style product attribute links.
 * Caller must run ensureProductAttributesTable BEFORE the transaction.
 */
export async function updateProductAttributes(
  productId: string,
  attributes: AttributesUpdateOps | undefined,
  tx: Prisma.TransactionClient
): Promise<void> {
  if (!attributes) {
    return;
  }

  if (attributes.replaceIds !== undefined) {
    await tx.productAttribute.deleteMany({ where: { productId } });
    if (attributes.replaceIds.length > 0) {
      await tx.productAttribute.createMany({
        data: attributes.replaceIds.map((attributeId) => ({
          productId,
          attributeId,
        })),
        skipDuplicates: true,
      });
      logger.info("Replaced ProductAttribute relations", {
        attributeIds: attributes.replaceIds,
      });
    }
    return;
  }

  if (attributes.removeIds && attributes.removeIds.length > 0) {
    await tx.productAttribute.deleteMany({
      where: {
        productId,
        attributeId: { in: attributes.removeIds },
      },
    });
  }

  if (attributes.addIds && attributes.addIds.length > 0) {
    await tx.productAttribute.createMany({
      data: attributes.addIds.map((attributeId) => ({
        productId,
        attributeId,
      })),
      skipDuplicates: true,
    });
    logger.info("Added ProductAttribute relations", {
      attributeIds: attributes.addIds,
    });
  }
}
