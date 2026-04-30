import type { Prisma } from "@prisma/client";

/**
 * Explicit scalar selection for `product_variants` so queries stay valid when the
 * generated Prisma client is briefly out of sync with the database (e.g. missing columns).
 */
export const PRODUCT_VARIANT_DB_SELECT = {
  id: true,
  productId: true,
  sku: true,
  barcode: true,
  price: true,
  compareAtPrice: true,
  cost: true,
  stock: true,
  stockReserved: true,
  weightGrams: true,
  imageUrl: true,
  position: true,
  published: true,
  attributes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductVariantSelect;

export const PRODUCT_VARIANT_SELECT_WITH_OPTIONS_FULL = {
  ...PRODUCT_VARIANT_DB_SELECT,
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
} satisfies Prisma.ProductVariantSelect;

export const PRODUCT_VARIANT_SELECT_WITH_OPTIONS_TRUE = {
  ...PRODUCT_VARIANT_DB_SELECT,
  options: true,
} satisfies Prisma.ProductVariantSelect;
