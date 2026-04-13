import { Prisma } from "@prisma/client";
import { logger } from "../../../utils/logger";
import { processImageUrl, smartSplitUrls } from "../../../utils/image-utils";
import { processVariantOptions, parseVariantPrices } from "./variant-processor";

/**
 * Find variant by ID or SKU
 */
async function findVariant(
  variant: {
    id?: string;
    sku?: string;
  },
  existingVariantIds: Set<string>,
  existingSkuMap: Map<string, string>,
  productId: string,
  tx: Prisma.TransactionClient
): Promise<{
  variantToUpdate: { id: string } | null;
  variantIdToUse: string | null;
}> {
  let variantToUpdate: { id: string } | null = null;
  let variantIdToUse: string | null = null;
  
  // First check by ID if provided
  if (variant.id && existingVariantIds.has(variant.id)) {
    variantToUpdate = await tx.productVariant.findUnique({
      where: { id: variant.id },
    });
    variantIdToUse = variant.id;
    logger.debug(`Variant lookup by ID ${variant.id}`, { found: !!variantToUpdate });
  }
  
  // If not found by ID, try to find by SKU using the SKU map (faster than DB query)
  if (!variantToUpdate && variant.sku) {
    const skuValue = variant.sku.trim();
    const skuKey = skuValue.toLowerCase();
    const matchedVariantId = existingSkuMap.get(skuKey);
    
    if (matchedVariantId) {
      variantToUpdate = await tx.productVariant.findUnique({
        where: { id: matchedVariantId },
      });
      variantIdToUse = matchedVariantId;
      logger.debug(`Variant lookup by SKU "${skuValue}"`, { found: true, variantId: matchedVariantId });
    } else {
      // Check if SKU exists globally (might be from another product)
      const existingSkuVariant = await tx.productVariant.findFirst({
        where: {
          sku: skuValue,
        },
      });
      
      if (existingSkuVariant) {
        logger.warn(`SKU "${skuValue}" already exists in product ${existingSkuVariant.productId}, but not in current product ${productId}`);
        // Don't use this variant, as it belongs to another product
        throw new Error(`SKU "${skuValue}" already exists in another product. Please use a unique SKU.`);
      }
      
      logger.debug(`Variant lookup by SKU "${skuValue}"`, { found: false });
    }
  }
  
  return { variantToUpdate, variantIdToUse };
}

/**
 * Process variant image URL
 */
function processVariantImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) {
    return undefined;
  }
  
  const urls = smartSplitUrls(imageUrl);
  const processedUrls = urls.map(url => processImageUrl(url)).filter((url): url is string => url !== null);
  return processedUrls.length > 0 ? processedUrls.join(',') : undefined;
}

/**
 * Update existing variant
 */
async function updateExistingVariant(
  variantId: string,
  variant: {
    sku?: string;
    imageUrl?: string;
    published?: boolean;
  },
  price: number,
  stock: number,
  compareAtPrice: number | undefined,
  attributesJson: Record<string, unknown> | null,
  options: Array<{ valueId?: string; attributeKey?: string; value?: string }>,
  tx: Prisma.TransactionClient
) {
  // Delete old options and create new ones
  await tx.productVariantOption.deleteMany({
    where: { variantId },
  });
  
  const processedVariantImageUrl = processVariantImageUrl(variant.imageUrl);

  await tx.productVariant.update({
    where: { id: variantId },
    data: {
      sku: variant.sku ? variant.sku.trim() : undefined,
      price,
      compareAtPrice,
      stock: isNaN(stock) ? 0 : stock,
      imageUrl: processedVariantImageUrl,
      published: variant.published !== false,
      attributes: (attributesJson || undefined) as Prisma.InputJsonValue | undefined,
      options: {
        create: options,
      },
    },
  });
  
  logger.info(`Updated variant`, { variantId });
}

/**
 * Create new variant
 */
async function createNewVariant(
  productId: string,
  variant: {
    sku?: string;
    imageUrl?: string;
    published?: boolean;
  },
  price: number,
  stock: number,
  compareAtPrice: number | undefined,
  attributesJson: Record<string, unknown> | null,
  options: Array<{ valueId?: string; attributeKey?: string; value?: string }>,
  tx: Prisma.TransactionClient
): Promise<string> {
  // Double-check that SKU doesn't already exist (safety check)
  if (variant.sku) {
    const skuValue = variant.sku.trim();
    const existingSkuCheck = await tx.productVariant.findFirst({
      where: {
        sku: skuValue,
      },
    });
    
    if (existingSkuCheck) {
      logger.error(`SKU "${skuValue}" already exists!`, { 
        variantId: existingSkuCheck.id, 
        productId: existingSkuCheck.productId 
      });
      throw new Error(`SKU "${skuValue}" already exists. Cannot create duplicate variant.`);
    }
  }
  
  const processedVariantImageUrl = processVariantImageUrl(variant.imageUrl);

  logger.info(`Creating new variant`, { sku: variant.sku || 'none' });
  const newVariant = await tx.productVariant.create({
    data: {
      productId,
      sku: variant.sku ? variant.sku.trim() : undefined,
      price,
      compareAtPrice,
      stock: isNaN(stock) ? 0 : stock,
      imageUrl: processedVariantImageUrl,
      published: variant.published !== false,
      attributes: (attributesJson || undefined) as Prisma.InputJsonValue | undefined,
      options: {
        create: options,
      },
    },
  });
  
  logger.info(`Created new variant`, { variantId: newVariant.id });
  return newVariant.id;
}

/**
 * Update or create variant
 */
export async function updateOrCreateVariant(
  variant: {
    id?: string;
    sku?: string;
    price: string | number;
    compareAtPrice?: string | number;
    stock: string | number;
    imageUrl?: string;
    published?: boolean;
    options?: Array<{
      attributeKey: string;
      value: string;
      valueId?: string;
    }>;
    color?: string;
    size?: string;
  },
  productId: string,
  locale: string,
  existingVariantIds: Set<string>,
  existingSkuMap: Map<string, string>,
  tx: Prisma.TransactionClient
): Promise<string> {
  // Process options and attributes
  const { options, attributesMap } = await processVariantOptions(variant, locale, tx);
  
  // Parse prices
  const { price, stock, compareAtPrice } = parseVariantPrices(variant);
  
  // Convert attributesMap to JSONB format
  const attributesJson = Object.keys(attributesMap).length > 0 ? attributesMap : null;

  // Find variant
  const { variantToUpdate, variantIdToUse } = await findVariant(
    variant,
    existingVariantIds,
    existingSkuMap,
    productId,
    tx
  );
  
  if (variantToUpdate && variantIdToUse) {
    // Update existing variant
    await updateExistingVariant(
      variantIdToUse,
      variant,
      price,
      stock,
      compareAtPrice,
      attributesJson,
      options,
      tx
    );
    return variantIdToUse;
  } else {
    // Create new variant
    return await createNewVariant(
      productId,
      variant,
      price,
      stock,
      compareAtPrice,
      attributesJson,
      options,
      tx
    );
  }
}

