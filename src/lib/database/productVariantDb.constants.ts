import type { Prisma } from "@white-shop/db";

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
  priceOnRequest: true,
  compareAtPrice: true,
  cost: true,
  stock: true,
  stockReserved: true,
  weightGrams: true,
  imageUrl: true,
  position: true,
  published: true,
  isMain: true,
  attributes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductVariantSelect;

/**
 * Deterministic variant order (admin `position`, then creation). Without an explicit
 * order PostgreSQL returns rows in arbitrary order, which reshuffles card swatches.
 */
export const PRODUCT_VARIANT_DISPLAY_ORDER = [
  { position: "asc" },
  { createdAt: "asc" },
  { id: "asc" },
] satisfies Prisma.ProductVariantOrderByWithRelationInput[];

export const PRODUCT_VARIANT_SELECT_WITH_OPTIONS_FULL = {
  ...PRODUCT_VARIANT_DB_SELECT,
  media: true,
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
