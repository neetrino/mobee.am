import { db } from "@white-shop/db";

const TOP_PRODUCTS_WINDOW_DAYS = 365;

function extractImageFromMedia(media: unknown[] | undefined): string | null {
  if (!Array.isArray(media) || media.length === 0) return null;
  const firstMedia = media[0];
  if (typeof firstMedia === "string") return firstMedia;
  if (firstMedia && typeof firstMedia === "object" && "url" in firstMedia) {
    return (firstMedia as { url?: string }).url || null;
  }
  return null;
}

function windowStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - TOP_PRODUCTS_WINDOW_DAYS);
  return d;
}

function mapTopRowsToProducts(
  sorted: Array<{
    variantId: string | null;
    _sum: { quantity: number | null; total: number | null };
    _count: { id: number };
  }>,
  variantById: Map<
    string,
    {
      id: string;
      productId: string;
      sku: string | null;
      product: {
        media: unknown;
        translations: Array<{ title: string }>;
      } | null;
    }
  >
) {
  return sorted.map((row) => {
    const v = variantById.get(row.variantId!);
    const title = v?.product?.translations?.[0]?.title ?? "Unknown Product";
    return {
      variantId: row.variantId!,
      productId: v?.productId ?? "",
      title,
      sku: v?.sku ?? "N/A",
      totalQuantity: row._sum.quantity ?? 0,
      totalRevenue: row._sum.total ?? 0,
      orderCount: row._count.id,
      image: extractImageFromMedia(v?.product?.media as unknown[] | undefined),
    };
  });
}

/**
 * Get top products for admin dashboard (aggregated in DB, bounded time window)
 */
export async function getTopProducts(limit: number = 5) {
  const grouped = await db.orderItem.groupBy({
    by: ["variantId"],
    where: {
      variantId: { not: null },
      order: { createdAt: { gte: windowStartDate() } },
    },
    _sum: { quantity: true, total: true },
    _count: { id: true },
  });

  const sorted = grouped
    .filter((row) => row.variantId)
    .sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0))
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const variants = await db.productVariant.findMany({
    where: { id: { in: sorted.map((r) => r.variantId!) } },
    select: {
      id: true,
      productId: true,
      sku: true,
      product: {
        select: {
          media: true,
          translations: { where: { locale: "en" }, take: 1, select: { title: true } },
        },
      },
    },
  });

  const variantById = new Map(variants.map((v) => [v.id, v]));
  return mapTopRowsToProducts(sorted, variantById);
}
