import { db } from "@white-shop/db";

type BestsellerVariantRow = {
  variantId: string | null;
  _sum: { quantity: number | null };
};

/**
 * Product IDs ranked by sold quantity. No artificial ranking window.
 */
export async function getBestsellerProductIdsRanked(): Promise<string[]> {
  const raw = await db.orderItem.groupBy({
    by: ["variantId"],
    _sum: { quantity: true },
    where: { variantId: { not: null } },
    orderBy: {
      _sum: {
        quantity: "desc" as const,
      },
    },
  });
  const grouped = raw as BestsellerVariantRow[];

  const variantIds = grouped
    .map((row) => row.variantId)
    .filter((id): id is string => Boolean(id));
  if (variantIds.length === 0) {
    return [];
  }

  const variants = await db.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, productId: true },
  });
  const variantToProduct = new Map(variants.map((row) => [row.id, row.productId]));
  const productSales = new Map<string, number>();

  for (const row of grouped) {
    if (!row.variantId) continue;
    const productId = variantToProduct.get(row.variantId);
    if (!productId) continue;
    const qty = row._sum.quantity ?? 0;
    productSales.set(productId, (productSales.get(productId) ?? 0) + qty);
  }

  return Array.from(productSales.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([productId]) => productId);
}
