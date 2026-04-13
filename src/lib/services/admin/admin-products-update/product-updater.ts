import { Prisma } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { cleanImageUrls, separateMainAndVariantImages, smartSplitUrls } from "../../../utils/image-utils";
import type { UpdateProductData } from "./types";

/**
 * Collect variant images from data or existing variants
 */
export async function collectVariantImages(
  variants: UpdateProductData['variants'],
  productId: string,
  tx: Prisma.TransactionClient
): Promise<string[]> {
  const allVariantImages: string[] = [];
  
  if (variants !== undefined) {
    variants.forEach((variant) => {
      if (variant.imageUrl) {
        const urls = smartSplitUrls(variant.imageUrl);
        allVariantImages.push(...urls);
      }
    });
  } else {
    // If variants not being updated, get existing variant images
    const existingVariants = await tx.productVariant.findMany({
      where: { productId },
      select: { imageUrl: true },
    });
    existingVariants.forEach((variant) => {
      if (variant.imageUrl) {
        const urls = smartSplitUrls(variant.imageUrl);
        allVariantImages.push(...urls);
      }
    });
  }
  
  return allVariantImages;
}

/**
 * Build product update data
 */
export function buildProductUpdateData(
  data: UpdateProductData,
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
} {
  const updateData: {
    brandId?: string | null;
    primaryCategoryId?: string | null;
    categoryIds?: string[];
    media?: string[];
    published?: boolean;
    publishedAt?: Date;
    featured?: boolean;
  } = {};
  
  if (data.brandId !== undefined) updateData.brandId = data.brandId || null;
  if (data.primaryCategoryId !== undefined) updateData.primaryCategoryId = data.primaryCategoryId || null;
  if (data.categoryIds !== undefined) updateData.categoryIds = data.categoryIds || [];
  
  if (data.media !== undefined) {
    // Separate main images from variant images and clean them
    const { main } = separateMainAndVariantImages(
      data.media as Array<string | { url?: string; src?: string; value?: string }>,
      allVariantImages
    );
    updateData.media = cleanImageUrls(main);
    logger.debug('Updated main media', { count: updateData.media.length, variantImagesExcluded: allVariantImages.length });
  }
  
  if (data.published !== undefined) {
    updateData.published = data.published;
    if (data.published && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }
  }
  
  if (data.featured !== undefined) updateData.featured = data.featured;
  
  return updateData;
}

/**
 * Update product translation
 */
export async function updateProductTranslation(
  productId: string,
  data: UpdateProductData,
  tx: Prisma.TransactionClient
) {
  if (data.title || data.slug || data.subtitle !== undefined || data.descriptionHtml !== undefined) {
    const locale = data.locale || "en";
    await tx.productTranslation.upsert({
      where: {
        productId_locale: {
          productId,
          locale,
        },
      },
      update: {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle || null }),
        ...(data.descriptionHtml !== undefined && { descriptionHtml: data.descriptionHtml || null }),
      },
      create: {
        productId,
        locale,
        title: data.title || "",
        slug: data.slug || "",
        subtitle: data.subtitle || null,
        descriptionHtml: data.descriptionHtml || null,
      },
    });
  }
}

/**
 * Update product labels
 */
export async function updateProductLabels(
  productId: string,
  labels: UpdateProductData['labels'],
  tx: Prisma.TransactionClient
) {
  if (labels !== undefined) {
    await tx.productLabel.deleteMany({ where: { productId } });
    if (labels.length > 0) {
      await tx.productLabel.createMany({
        data: labels.map((label) => ({
          productId,
          type: label.type,
          value: label.value,
          position: label.position,
          color: label.color || undefined,
        })),
      });
    }
  }
}

/**
 * Update product attributes
 */
export async function updateProductAttributes(
  productId: string,
  attributeIds: UpdateProductData['attributeIds'],
  tx: Prisma.TransactionClient
) {
  if (attributeIds !== undefined) {
    // Ensure table exists (for Vercel deployments where migrations might not run)
    const { ensureProductAttributesTable } = await import("../../../utils/db-ensure");
    await ensureProductAttributesTable();
    
    await tx.productAttribute.deleteMany({ where: { productId } });
    if (attributeIds.length > 0) {
      await tx.productAttribute.createMany({
        data: attributeIds.map((attributeId) => ({
          productId,
          attributeId,
        })),
        skipDuplicates: true,
      });
      logger.info('Updated ProductAttribute relations', { attributeIds });
    }
  }
}

