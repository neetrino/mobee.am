import { Prisma } from "@white-shop/db";
import { db } from "@white-shop/db";
import {
  PRODUCT_VARIANT_SELECT_WITH_OPTIONS_FULL,
  PRODUCT_VARIANT_SELECT_WITH_OPTIONS_TRUE,
} from "@/lib/database/productVariantDb.constants";
import { ensureProductVariantAttributesColumn } from "../../utils/db-ensure";
import { logger } from "../../utils/logger";
import type { ProductWithRelations } from "./types";
import type { ProductSortOption } from "@/lib/products/sort";

/**
 * Base include configuration for product queries.
 * When `listingMode` is true, omits `categories` (not needed for grid cards; avoids extra joins).
 */
const getBaseInclude = (listingMode: boolean) => ({
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
    select: PRODUCT_VARIANT_SELECT_WITH_OPTIONS_FULL,
  },
  labels: true,
  ...(listingMode
    ? {}
    : {
        categories: {
          include: {
            translations: true,
          },
        },
      }),
});

/**
 * Base include without attributeValue relation (fallback)
 */
const getBaseIncludeWithoutAttributeValue = (listingMode: boolean) => ({
  ...getBaseInclude(listingMode),
  variants: {
    where: {
      published: true,
    },
    select: PRODUCT_VARIANT_SELECT_WITH_OPTIONS_TRUE,
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
  skip: number = 0,
  sort: ProductSortOption = "default",
  listingMode = false,
): Promise<ProductWithRelations[]> {
  const baseInclude = getBaseInclude(listingMode);
  const orderBy = getOrderBy(sort);

  try {
    const products = await db.product.findMany({
      where,
      include: {
        ...baseInclude,
        ...getProductAttributesInclude(),
      },
      orderBy,
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
      return executeWithoutProductAttributes(where, limit, skip, sort, listingMode);
    }

    if (isVariantAttributesError(error)) {
      logger.warn('product_variants.attributes column not found, attempting to create it');
      try {
        await ensureProductVariantAttributesColumn();
        const products = await db.product.findMany({
          where,
          include: baseInclude,
          orderBy,
          skip,
          take: limit,
        });
        logger.info(`Found ${products.length} products from database (after creating attributes column)`);
        return products as unknown as ProductWithRelations[];
      } catch (attributesError: unknown) {
        return handleAttributesError(attributesError, where, limit, skip, sort, listingMode);
      }
    }

    if (isAttributeValuesColorsError(error)) {
      logger.warn('attribute_values.colors column not found, fetching without attributeValue', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return executeWithoutAttributeValue(where, limit, skip, sort, listingMode);
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
  skip: number = 0,
  sort: ProductSortOption = "default",
  listingMode = false,
): Promise<ProductWithRelations[]> {
  const baseInclude = getBaseInclude(listingMode);
  const orderBy = getOrderBy(sort);

  try {
    const products = await db.product.findMany({
      where,
      include: baseInclude,
      orderBy,
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
          orderBy,
          skip,
          take: limit,
        });
        logger.info(`Found ${products.length} products from database (after creating attributes column)`);
        return products as unknown as ProductWithRelations[];
      } catch (attributesError: unknown) {
        return handleAttributesError(attributesError, where, limit, skip, sort, listingMode);
      }
    }

    if (isAttributeValuesColorsError(retryError)) {
      logger.warn('attribute_values.colors column not found, fetching without attributeValue', { 
        error: retryError instanceof Error ? retryError.message : String(retryError) 
      });
      return executeWithoutAttributeValue(where, limit, skip, sort, listingMode);
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
  skip: number = 0,
  sort: ProductSortOption = "default",
  listingMode = false,
): Promise<ProductWithRelations[]> {
  if (isAttributeValuesColorsError(error)) {
    logger.warn('attribute_values.colors column not found, fetching without attributeValue', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return executeWithoutAttributeValue(where, limit, skip, sort, listingMode);
  }
  throw error;
}

/**
 * Execute query without attributeValue relation (fallback)
 */
async function executeWithoutAttributeValue(
  where: Prisma.ProductWhereInput,
  limit: number,
  skip: number = 0,
  sort: ProductSortOption = "default",
  listingMode = false,
): Promise<ProductWithRelations[]> {
  const baseIncludeWithoutAttributeValue = getBaseIncludeWithoutAttributeValue(listingMode);
  const orderBy = getOrderBy(sort);

  // Try to include productAttributes even in fallback
  try {
    const products = await db.product.findMany({
      where,
      include: {
        ...baseIncludeWithoutAttributeValue,
        ...getProductAttributesInclude(),
      },
      orderBy,
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
        orderBy,
        skip,
        take: limit,
      });
      logger.info(`Found ${products.length} products from database (without attributeValue and productAttributes)`);
      return products as unknown as ProductWithRelations[];
    }
    throw productAttrError;
  }
}

function getOrderBy(sort: ProductSortOption): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
    case "price-desc":
      // Prisma does not support ordering Product by variant aggregate (_min/_max) in this schema;
      // price ordering for unpaginated/overfetch paths is applied in products-find-filter.service.
      return [{ createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

/**
 * Listing "from" price: minimum published variant price (matches grid / filter sort).
 */
function listPriceFromLightVariants(
  variants: ReadonlyArray<{ price: number }>
): number {
  if (variants.length === 0) return 0;
  return Math.min(...variants.map((v) => v.price));
}

/**
 * Paginated catalog sort by list price: load lightweight rows, sort in memory, then full rows for the page.
 * Avoids PrismaClientValidationError from unsupported relation aggregate orderBy.
 */
export async function fetchProductsPageForPriceSort(
  where: Prisma.ProductWhereInput,
  limit: number,
  skip: number,
  sort: "price-asc" | "price-desc",
  listingMode: boolean
): Promise<ProductWithRelations[]> {
  const lightRows = await db.product.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      variants: {
        where: { published: true },
        select: { price: true },
      },
    },
  });

  const sortedIds = lightRows
    .map((row) => ({
      id: row.id,
      listPrice: listPriceFromLightVariants(row.variants),
      createdAt: row.createdAt,
    }))
    .sort((a, b) => {
      if (a.listPrice !== b.listPrice) {
        return sort === "price-asc"
          ? a.listPrice - b.listPrice
          : b.listPrice - a.listPrice;
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    })
    .map((row) => row.id);

  const pageIds = sortedIds.slice(skip, skip + limit);
  if (pageIds.length === 0) {
    return [];
  }

  const narrowedWhere: Prisma.ProductWhereInput = {
    AND: [where, { id: { in: pageIds } }],
  };

  const products = await executeProductQuery(
    narrowedWhere,
    pageIds.length,
    0,
    "default",
    listingMode
  );

  const orderMap = new Map(pageIds.map((id, index) => [id, index]));
  products.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  return products;
}

