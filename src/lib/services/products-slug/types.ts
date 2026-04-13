import { Prisma } from "@prisma/client";

/**
 * Type for product with all relations needed for slug service
 */
export type ProductWithFullRelations = Prisma.ProductGetPayload<{
  include: {
    translations: true;
    brand: {
      include: {
        translations: true;
      };
    };
    categories: {
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
    productAttributes?: {
      include: {
        attribute: {
          include: {
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

/**
 * Type for product variant with options
 */
export type ProductVariantWithOptions = ProductWithFullRelations['variants'][number];




