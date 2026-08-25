import { db } from "@white-shop/db";
import type { Prisma } from "@white-shop/db";

export type BrandResolution =
  | { status: "skip" }
  | { status: "empty" }
  | { status: "ids"; ids: string[] };

type BrandLookup = {
  findMany(args: {
    where: Prisma.BrandWhereInput;
    select: { id: true };
  }): Promise<Array<{ id: string }>>;
};

function brandTokenOrWhere(tokens: string[]): Prisma.BrandWhereInput {
  const lowered = [...new Set(tokens.map((token) => token.toLowerCase()))];
  const nameEquals: Prisma.BrandTranslationWhereInput[] = tokens.map((token) => ({
    name: { equals: token, mode: "insensitive" },
  }));

  return {
    deletedAt: null,
    OR: [
      { id: { in: tokens } },
      { slug: { in: [...tokens, ...lowered] } },
      { translations: { some: { OR: nameEquals } } },
    ],
  };
}

/**
 * Resolve sidebar IDs, home-logo slugs, and localized names to brand IDs.
 */
export async function resolveBrandIds(
  tokens: string[],
  brandTable: BrandLookup = db.brand,
): Promise<BrandResolution> {
  if (tokens.length === 0) {
    return { status: "skip" };
  }

  const rows = await brandTable.findMany({
    where: brandTokenOrWhere(tokens),
    select: { id: true },
  });

  const ids = [...new Set(rows.map((row) => row.id))];
  if (ids.length === 0) {
    return { status: "empty" };
  }
  return { status: "ids", ids };
}

export function buildBrandWhere(resolution: BrandResolution): Prisma.ProductWhereInput | null {
  if (resolution.status === "skip") {
    return null;
  }
  if (resolution.status === "empty") {
    return { id: { in: [] } };
  }
  return { brandId: { in: resolution.ids } };
}

export function productMatchesBrandTokens(
  product: {
    brandId?: string | null;
    brand?: {
      id?: string;
      slug?: string | null;
      translations?: Array<{ name?: string | null }> | null;
    } | null;
  },
  brandList: string[],
): boolean {
  if (brandList.length === 0) {
    return true;
  }
  if (product.brandId && brandList.includes(product.brandId)) {
    return true;
  }

  const normalized = brandList.map((token) => token.toLowerCase());
  const brand = product.brand;
  if (!brand) {
    return false;
  }
  if (brand.id && brandList.includes(brand.id)) {
    return true;
  }
  if (brand.slug && normalized.includes(brand.slug.toLowerCase())) {
    return true;
  }
  const names = brand.translations?.map((row) => row.name?.trim().toLowerCase() ?? "") ?? [];
  return names.some((name) => name.length > 0 && normalized.includes(name));
}
