import { db } from "@white-shop/db";
import { smartSplitUrls } from "../../../utils/image-utils";

const TOP_PRODUCTS_WINDOW_DAYS = 365;

interface TopProductAggregateRow {
  variantId: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

function extractImageFromMedia(media: unknown[] | undefined): string | null {
  if (!Array.isArray(media) || media.length === 0) return null;
  const firstMedia = media[0];
  if (typeof firstMedia === "string") return firstMedia;
  if (firstMedia && typeof firstMedia === "object" && "url" in firstMedia) {
    return (firstMedia as { url?: string }).url || null;
  }
  return null;
}

function resolveProductImage(
  media: unknown[] | undefined,
  variantImageUrl: string | null | undefined,
): string | null {
  const fromMedia = extractImageFromMedia(media);
  if (fromMedia) return fromMedia;

  if (typeof variantImageUrl === "string" && variantImageUrl.trim().length > 0) {
    const urls = smartSplitUrls(variantImageUrl);
    return urls[0] ?? null;
  }

  return null;
}

function windowStartDate() {
  const d = new Date();
  d.setDate(d.getDate() - TOP_PRODUCTS_WINDOW_DAYS);
  return d;
}

async function fetchTopProductAggregates(limit: number): Promise<TopProductAggregateRow[]> {
  const windowStart = windowStartDate();

  const rows = await db.$queryRaw<TopProductAggregateRow[]>`
    SELECT
      oi."variantId" AS "variantId",
      COALESCE(SUM(oi.quantity), 0)::float AS "totalQuantity",
      COALESCE(SUM(oi.total), 0)::float AS "totalRevenue",
      COUNT(oi.id)::int AS "orderCount"
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi."orderId"
    WHERE oi."variantId" IS NOT NULL
      AND o."createdAt" >= ${windowStart}
    GROUP BY oi."variantId"
    ORDER BY SUM(oi.total) DESC
    LIMIT ${limit}
  `;

  return rows;
}

/**
 * Get top products for admin dashboard (SQL LIMIT + targeted variant fetch)
 */
export async function getTopProducts(limit: number = 5) {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const sorted = await fetchTopProductAggregates(safeLimit);

  if (sorted.length === 0) {
    return [];
  }

  const variants = await db.productVariant.findMany({
    where: { id: { in: sorted.map((row) => row.variantId) } },
    select: {
      id: true,
      productId: true,
      sku: true,
      imageUrl: true,
      product: {
        select: {
          media: true,
          translations: { where: { locale: "en" }, take: 1, select: { title: true } },
        },
      },
    },
  });

  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  return sorted.map((row) => {
    const variant = variantById.get(row.variantId);
    const title = variant?.product?.translations?.[0]?.title ?? "Unknown Product";

    return {
      variantId: row.variantId,
      productId: variant?.productId ?? "",
      title,
      sku: variant?.sku ?? "N/A",
      totalQuantity: row.totalQuantity,
      totalRevenue: row.totalRevenue,
      orderCount: row.orderCount,
      image: resolveProductImage(
        variant?.product?.media as unknown[] | undefined,
        variant?.imageUrl,
      ),
    };
  });
}
