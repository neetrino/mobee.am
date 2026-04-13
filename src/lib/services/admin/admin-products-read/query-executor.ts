import { Prisma } from "@prisma/client";
import { db } from "@white-shop/db";
import { ensureProductVariantAttributesColumn } from "../../../utils/db-ensure";
import { logger } from "../../../utils/logger";

/**
 * Base include configuration for product list queries
 */
const getProductListInclude = () => ({
  translations: {
    where: { locale: "en" },
    take: 1,
  },
  variants: {
    where: { published: true },
    take: 1,
    orderBy: { price: "asc" as const },
  },
  labels: true,
});

/**
 * Base include configuration for product detail queries
 */
const getProductDetailInclude = () => ({
  translations: true,
  brand: {
    include: {
      translations: true,
    },
  },
  categories: {
    include: {
      translations: true,
    },
  },
  variants: {
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
    orderBy: {
      position: "asc" as const,
    },
  },
  labels: true,
});

/**
 * ProductAttributes include configuration
 */
const getProductAttributesInclude = () => ({
  productAttributes: {
    include: {
      attribute: true,
    },
  },
});

/**
 * Check if error is related to product_variants.attributes column
 */
function isVariantAttributesError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes('product_variants.attributes') || 
         (errorMessage.includes('attributes') && errorMessage.includes('does not exist'));
}

/**
 * Check if error is related to productAttributes table
 */
function isProductAttributesError(error: unknown): boolean {
  const errorObj = error as { code?: string; message?: string };
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (errorObj && typeof errorObj === 'object' && 'code' in errorObj && errorObj.code === 'P2021') || 
         errorMessage.includes('productAttributes') || 
         errorMessage.includes('does not exist');
}

/**
 * Execute product list query with error handling
 */
export async function executeProductListQuery(
  where: Prisma.ProductWhereInput,
  orderBy: Prisma.ProductOrderByWithRelationInput,
  skip: number,
  take: number
) {
  const queryStartTime = Date.now();
  
  try {
    // Test database connection first
    logger.debug('Testing database connection...');
    await db.$queryRaw`SELECT 1`;
    logger.debug('Database connection OK');

    // Fetch products
    logger.debug('Fetching products...');
    const products = await db.product.findMany({
      where,
      skip,
      take,
      orderBy,
      include: getProductListInclude(),
    });
    
    const productsTime = Date.now() - queryStartTime;
    logger.debug(`Products fetched in ${productsTime}ms. Found ${products.length} products`);

    // Get count with timeout
    logger.debug('Counting total products...');
    const countStartTime = Date.now();
    
    const countPromise = db.product.count({ where });
    const timeoutPromise = new Promise<number>((_, reject) => 
      setTimeout(() => reject(new Error("Count query timeout")), 10000)
    );
    
    let total: number;
    try {
      total = await Promise.race([countPromise, timeoutPromise]) as number;
      const countTime = Date.now() - countStartTime;
      logger.debug(`Count completed in ${countTime}ms. Total: ${total}`);
    } catch (countError: unknown) {
      logger.warn('Count query failed, using estimated total', { 
        error: countError instanceof Error ? countError.message : String(countError) 
      });
      total = products.length || take;
    }
    
    const queryTime = Date.now() - queryStartTime;
    logger.debug(`All database queries completed in ${queryTime}ms`);

    return { products, total };
  } catch (error: unknown) {
    // If product_variants.attributes column doesn't exist, try to create it and retry
    if (isVariantAttributesError(error)) {
      logger.warn('product_variants.attributes column not found, attempting to create it...');
      try {
        await ensureProductVariantAttributesColumn();
        // Retry the query after creating the column
        const products = await db.product.findMany({
          where,
          skip,
          take,
          orderBy,
          include: getProductListInclude(),
        });
        
        const productsTime = Date.now() - queryStartTime;
        logger.debug(`Products fetched in ${productsTime}ms. Found ${products.length} products (after creating attributes column)`);
        
        // Get count
        const countStartTime = Date.now();
        const countPromise = db.product.count({ where });
        const timeoutPromise = new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error("Count query timeout")), 10000)
        );
        
        let total: number;
        try {
          total = await Promise.race([countPromise, timeoutPromise]) as number;
          const countTime = Date.now() - countStartTime;
          logger.debug(`Count completed in ${countTime}ms. Total: ${total}`);
        } catch (countError: unknown) {
          logger.warn('Count query failed, using estimated total', { 
            error: countError instanceof Error ? countError.message : String(countError) 
          });
          total = products.length || take;
        }
        
        const queryTime = Date.now() - queryStartTime;
        logger.debug(`All database queries completed in ${queryTime}ms`);

        return { products, total };
      } catch (retryError: unknown) {
        const queryTime = Date.now() - queryStartTime;
        const errorMessage = retryError instanceof Error ? retryError.message : String(retryError);
        logger.error(`Database query error after ${queryTime}ms (after retry)`, { error: errorMessage });
        throw retryError;
      }
    }

    const queryTime = Date.now() - queryStartTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error as { code?: string; meta?: unknown; stack?: string };
    logger.error(`Database query error after ${queryTime}ms`, {
      error: {
        message: errorMessage,
        code: errorObj?.code,
        meta: errorObj?.meta,
        stack: errorObj?.stack?.substring(0, 500),
      },
    });
    
    throw error;
  }
}

/**
 * Execute product detail query with error handling
 */
export async function executeProductDetailQuery(productId: string) {
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        ...getProductDetailInclude(),
        ...getProductAttributesInclude(),
      },
    });
    return product;
  } catch (error: unknown) {
    // If productAttributes table doesn't exist, retry without it
    if (isProductAttributesError(error)) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('productAttributes table not found, fetching without it', { error: errorMessage });
      const product = await db.product.findUnique({
        where: { id: productId },
        include: getProductDetailInclude(),
      });
      return product;
    }
    throw error;
  }
}

