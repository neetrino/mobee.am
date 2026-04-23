import { Prisma } from "@prisma/client";
import type { ProductSortOption } from "@/lib/products/sort";

/**
 * Product filters interface
 */
export interface ProductFilters {
  category?: string;
  search?: string;
  filter?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string;
  sizes?: string;
  brand?: string;
  sort?: ProductSortOption;
  page?: number;
  limit?: number;
  lang?: string;
}

/**
 * Type for product with all relations needed for find query service
 */
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    translations: true;
    brand: {
      include: {
        translations: true;
      };
    };
    variants: {
      include: {
        options: {
          include: {
            attributeValue: {
              include: {
                attribute: true;
                translations: true;
              };
            };
          };
        };
      };
    };
    labels: true;
    categories: {
      include: {
        translations: true;
      };
    };
    productAttributes?: {
      include: {
        attribute: {
          include: {
            translations: true;
            values: {
              include: {
                translations: true;
              };
            };
          };
        };
      };
    };
  };
}>;




