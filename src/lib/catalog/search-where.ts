import type { Prisma } from "@white-shop/db";

/**
 * Search title, subtitle, and variant SKU (locale-agnostic contains).
 */
export function buildSearchWhere(search: string): Prisma.ProductWhereInput {
  const term = search.trim();
  return {
    OR: [
      {
        translations: {
          some: {
            title: { contains: term, mode: "insensitive" },
          },
        },
      },
      {
        translations: {
          some: {
            subtitle: { contains: term, mode: "insensitive" },
          },
        },
      },
      {
        variants: {
          some: {
            published: true,
            sku: { contains: term, mode: "insensitive" },
          },
        },
      },
    ],
  };
}
