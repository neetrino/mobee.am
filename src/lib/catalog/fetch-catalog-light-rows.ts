import { db } from "@white-shop/db";
import type { Prisma } from "@white-shop/db";
import type { CatalogLightRow } from "./catalog-light.types";

const CATALOG_LIST_LIGHT_SELECT = {
  id: true,
  createdAt: true,
  featured: true,
  media: true,
  discountPercent: true,
  primaryCategoryId: true,
  brandId: true,
  translations: {
    select: { locale: true, title: true },
  },
  variants: {
    where: { published: true },
    select: {
      price: true,
      priceOnRequest: true,
      imageUrl: true,
      media: true,
    },
  },
} as const;

const CATALOG_FACET_LIGHT_SELECT = {
  ...CATALOG_LIST_LIGHT_SELECT,
  brand: {
    select: {
      id: true,
      slug: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
  },
  variants: {
    where: { published: true },
    select: {
      price: true,
      priceOnRequest: true,
      imageUrl: true,
      media: true,
      options: {
        select: {
          attributeKey: true,
          value: true,
          attributeValue: {
            select: {
              value: true,
              colors: true,
              imageUrl: true,
              attribute: { select: { key: true } },
              translations: { select: { locale: true, label: true } },
            },
          },
        },
      },
    },
  },
} as const;

export type CatalogLightFetchMode = "list" | "facets";

/**
 * Candidate rows for price/sort/facets. No result-window cap.
 * List mode omits variant options and brand translations.
 */
export async function fetchCatalogLightRows(
  where: Prisma.ProductWhereInput,
  mode: CatalogLightFetchMode = "facets",
): Promise<CatalogLightRow[]> {
  const rows = await db.product.findMany({
    where,
    select: mode === "list" ? CATALOG_LIST_LIGHT_SELECT : CATALOG_FACET_LIGHT_SELECT,
  });
  return rows as unknown as CatalogLightRow[];
}

export { CATALOG_LIST_LIGHT_SELECT, CATALOG_FACET_LIGHT_SELECT };
