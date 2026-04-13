import { Prisma } from "@prisma/client";
import { db } from "@white-shop/db";
import { ensureProductVariantAttributesColumn } from "../../utils/db-ensure";
import { logger } from "../../utils/logger";
import type { ProductWithRelations } from "./types";

/**
 * Base include configuration for product queries
 */
const getBaseInclude = () => ({
  translations: true,
  brand: {
    include: {
      translations: true,
    },
  },
  variants: {
    where: {
      published: true,
    },
    include: {
      options: {
        include: {
          attributeValue: {
            include: {
              attribute: true,
              translations: true,
            },
          },
        },
      },
    },
  },
  labels: true,
  categories: {
    include: {
      translations: true,
    },
  },
});

/**
 * Base include without attributeValue relation (fallback)
 */
const getBaseIncludeWithoutAttributeValue = () => ({
  ...getBaseInclude(),
  variants: {
    where: {
      published: true,
    },
    include: {
      options: true, // Include options without attributeValue relation
    },
  },
});

/**
 * ProductAttributes include configuration
 */
const getProductAttributesInclude = () => ({
  productAttributes: {
    include: {
      attribute: {
        include: {
          translations: true,
          values: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
  },
});

/**
 * Check if error is related to product_attributes table
 */
function isProductAttributesError(error: unknown): boolean {
  const errorObj = error as { code?: string; message?: string };
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (errorObj && typeof errorObj === 'object' && 'code' in errorObj && errorObj.code === 'P2021') || 
         errorMessage.includes('product_attributes') || 
         errorMessage.includes('does not exist');
}

/**
 * Check if error is related to product_variants.attributes column
 */
function isVariantAttributesError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes('product_variants.attributes') || 
         (errorMessage.includes('attributes') && errorMessage.includes('does not exist'));
}

/**
 * Check if error is related to attribute_values.colors column
 */
function isAttributeValuesColorsError(error: unknown): boolean {
  const errorObj = error as { code?: string; message?: string };
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (errorObj && typeof errorObj === 'object' && 'code' in errorObj && errorObj.code === 'P2022') || 
         errorMessage.includes('attribute_values.colors') || 
         errorMessage.includes('does not exist');
}

/**
 * Execute product query with comprehensive error handling
 */
export async function executeProductQuery(
  where: Prisma.ProductWhereInput,
  limit: number,
  skip: number = 0
): Promise<ProductWithRelations[]> {
  const baseInclude = getBaseInclude();

  try {
    const products = await db.product.findMany({
      where,
      include: {
        ...baseInclude,
        ...getProductAttributesInclude(),
      },
      skip,
      take: limit,
    });
    logger.info(`Found ${products.length} products from database (with productAttributes)`);
    return products as unknown as ProductWithRelations[];
  } catch (error: unknown) {
    // If productAttributes table doesn't exist, retry without it
    if (isProductAttributesError(error)) {
      logger.warn('product_attributes table not found, fetching without it', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return executeWithoutProductAttributes(where, limit, skip);
    }

    if (isVariantAttributesError(error)) {
      logger.warn('product_variants.attributes column not found, attempting to create it');
      try {
        await ensureProductVariantAttributesColumn();
        const products = await db.product.findMany({
          where,
          include: baseInclude,
          skip,
          take: limit,
        });
        logger.info(`Found ${products.length} products from database (after creating attributes column)`);
        return products as unknown as ProductWithRelations[];
      } catch (attributesError: unknown) {
        return handleAttributesError(attributesError, where, limit, skip);
      }
    }

    if (isAttributeValuesColorsError(error)) {
      logger.warn('attribute_values.colors column not found, fetching without attributeValue', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return executeWithoutAttributeValue(where, limit, skip);
    }

    throw error;
  }
}

/**
 * Execute query without productAttributes (fallback)
 */
async function executeWithoutProductAttributes(
  where: Prisma.ProductWhereInput,
  limit: number,
  skip: number = 0
): Promise<ProductWithRelations[]> {
  const baseInclude = getBaseInclude();

  try {
    const products = await db.product.findMany({
      where,
      include: baseInclude,
      skip,
      take: limit,
    });
    logger.info(`Found ${products.length} products from database (without productAttributes)`);
    return products as unknown as ProductWithRelations[];
  } catch (retryError: unknown) {
    if (isVariantAttributesError(retryError)) {
      logger.warn('product_variants.attributes column not found, attempting to create it');
      try {
        await ensureProductVariantAttributesColumn();
        const products = await db.product.findMany({
          where,
          include: baseInclude,
          skip,
          take: limit,
        });
        logger.info(`Found ${products.length} products from database (after creating attributes column)`);
        return products as unknown as ProductWithRelations[];
      } catch (attributesError: unknown) {
        return handleAttributesError(attributesError, where, limit, skip);
      }
    }

    if (isAttributeValuesColorsError(retryError)) {
      logger.warn('attribute_values.colors column not found, fetching without attributeValue', { 
        error: retryError instanceof Error ? retryError.message : String(retryError) 
      });
      return executeWithoutAttributeValue(where, limit, skip);
    }

    throw retryError;
  }
}

/**
 * Handle attributes-related errors
 */
async function handleAttributesError(
  error: unknown,
  where: Prisma.ProductWhereInput,
  limit: number,
  skip: number = 0
): Promise<ProductWithRelations[]> {
  if (isAttributeValuesColorsError(error)) {
    logger.warn('attribute_values.colors column not found, fetching without attributeValue', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return executeWithoutAttributeValue(where, limit, skip);
  }
  throw error;
}

/**
 * Execute query without attributeValue relation (fallback)
 */
async function executeWithoutAttributeValue(
  where: Prisma.ProductWhereInput,
  limit: number,
  skip: number = 0
): Promise<ProductWithRelations[]> {
  const baseIncludeWithoutAttributeValue = getBaseIncludeWithoutAttributeValue();

  // Try to include productAttributes even in fallback
  try {
    const products = await db.product.findMany({
      where,
      include: {
        ...baseIncludeWithoutAttributeValue,
        ...getProductAttributesInclude(),
      },
      skip,
      take: limit,
    });
    logger.info(`Found ${products.length} products from database (without attributeValue, with productAttributes)`);
    return products as unknown as ProductWithRelations[];
  } catch (productAttrError: unknown) {
    // If productAttributes also fails, try without it
    if (isProductAttributesError(productAttrError)) {
      const products = await db.product.findMany({
        where,
        include: baseIncludeWithoutAttributeValue,
        skip,
        take: limit,
      });
      logger.info(`Found ${products.length} products from database (without attributeValue and productAttributes)`);
      return products as unknown as ProductWithRelations[];
    }
    throw productAttrError;
  }
}

