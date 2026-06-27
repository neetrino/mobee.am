import { db } from "@white-shop/db";
import type { Prisma } from "@white-shop/db";
import { buildCategoryTreesOrWhere } from "./products-find-query/category-utils";
import {
  loadProductDiscountContext,
  type ProductDiscountContext,
} from "./products-find-transform.service";
import {
  computeEffectiveVariantPrice,
  resolveAppliedDiscountPercent,
} from "./products-effective-price";

export type PriceBoundsFilters = {
  category?: string;
  search?: string;
  lang?: string;
};

export type PriceBoundsResult = {
  min: number;
  max: number;
  hasProducts: boolean;
};

type ProductPriceRow = {
  discountPercent?: number | null;
  primaryCategoryId?: string | null;
  brandId?: string | null;
  variants: Array<{ price: number }>;
};

export async function buildPriceBoundsWhere(
  filters: PriceBoundsFilters,
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = {
    published: true,
    deletedAt: null,
  };

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.OR = [
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
            sku: { contains: term, mode: "insensitive" },
          },
        },
      },
    ];
  }

  if (filters.category) {
    const catWhere = await buildCategoryTreesOrWhere(
      filters.category,
      filters.lang || "en",
    );
    if (catWhere) {
      if (where.OR) {
        where.AND = [{ OR: where.OR }, catWhere];
        delete where.OR;
      } else {
        Object.assign(where, catWhere);
      }
    }
  }

  return where;
}

export function computePriceBoundsFromProductRows(
  products: ProductPriceRow[],
  discounts: ProductDiscountContext,
): PriceBoundsResult {
  let min = Infinity;
  let max = 0;

  for (const product of products) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length === 0) continue;

    const discountPercent = resolveAppliedDiscountPercent(product, discounts);

    for (const variant of variants) {
      if (typeof variant.price !== "number" || !Number.isFinite(variant.price)) {
        continue;
      }
      const effective = computeEffectiveVariantPrice(variant.price, discountPercent);
      if (!Number.isFinite(effective)) continue;
      if (effective < min) min = effective;
      if (effective > max) max = effective;
    }
  }

  if (min === Infinity || max <= 0) {
    return { min: 0, max: 0, hasProducts: false };
  }

  return { min, max, hasProducts: true };
}

export async function loadPriceBounds(filters: PriceBoundsFilters): Promise<PriceBoundsResult> {
  const where = await buildPriceBoundsWhere(filters);
  const discounts = await loadProductDiscountContext();

  const products = await db.product.findMany({
    where,
    select: {
      discountPercent: true,
      primaryCategoryId: true,
      brandId: true,
      variants: {
        where: { published: true },
        select: { price: true },
      },
    },
  });

  return computePriceBoundsFromProductRows(products, discounts);
}
