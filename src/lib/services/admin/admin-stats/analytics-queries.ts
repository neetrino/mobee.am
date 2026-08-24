import { db } from "@white-shop/db";
import { smartSplitUrls } from "../../../utils/image-utils";

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsOrdersSummaryRow {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

export interface AnalyticsOrdersByDayRow {
  _id: string;
  count: number;
  revenue: number;
}

export interface AnalyticsTopProductRow {
  variantId: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export interface AnalyticsTopCategoryRow {
  categoryId: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export async function fetchAnalyticsOrdersSummary(
  range: AnalyticsDateRange,
): Promise<AnalyticsOrdersSummaryRow> {
  const rows = await db.$queryRaw<AnalyticsOrdersSummaryRow[]>`
    SELECT
      COUNT(*)::int AS "totalOrders",
      COUNT(*) FILTER (WHERE o."paymentStatus" = 'paid')::int AS "paidOrders",
      COUNT(*) FILTER (WHERE o.status = 'pending')::int AS "pendingOrders",
      COUNT(*) FILTER (WHERE o.status = 'completed')::int AS "completedOrders",
      COALESCE(SUM(o.total) FILTER (WHERE o."paymentStatus" = 'paid'), 0)::float AS "totalRevenue"
    FROM orders o
    WHERE o."createdAt" >= ${range.start}
      AND o."createdAt" <= ${range.end}
  `;

  return (
    rows[0] ?? {
      totalOrders: 0,
      paidOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenue: 0,
    }
  );
}

export async function fetchAnalyticsOrdersCurrency(
  range: AnalyticsDateRange,
): Promise<string | null> {
  const rows = await db.$queryRaw<Array<{ currency: string | null }>>`
    SELECT o.currency
    FROM orders o
    WHERE o."createdAt" >= ${range.start}
      AND o."createdAt" <= ${range.end}
      AND o.currency IS NOT NULL
    ORDER BY o."createdAt" DESC
    LIMIT 1
  `;

  return rows[0]?.currency ?? null;
}

export async function fetchAnalyticsOrdersByDay(
  range: AnalyticsDateRange,
): Promise<AnalyticsOrdersByDayRow[]> {
  return db.$queryRaw<AnalyticsOrdersByDayRow[]>`
    SELECT
      to_char(o."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "_id",
      COUNT(*)::int AS count,
      COALESCE(SUM(o.total) FILTER (WHERE o."paymentStatus" = 'paid'), 0)::float AS revenue
    FROM orders o
    WHERE o."createdAt" >= ${range.start}
      AND o."createdAt" <= ${range.end}
    GROUP BY to_char(o."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    ORDER BY to_char(o."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD')
  `;
}

export async function fetchAnalyticsTopProducts(
  range: AnalyticsDateRange,
  limit: number,
): Promise<AnalyticsTopProductRow[]> {
  return db.$queryRaw<AnalyticsTopProductRow[]>`
    SELECT
      oi."variantId" AS "variantId",
      COALESCE(SUM(oi.quantity), 0)::float AS "totalQuantity",
      COALESCE(SUM(oi.total), 0)::float AS "totalRevenue",
      COUNT(oi.id)::int AS "orderCount"
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi."orderId"
    WHERE oi."variantId" IS NOT NULL
      AND o."createdAt" >= ${range.start}
      AND o."createdAt" <= ${range.end}
    GROUP BY oi."variantId"
    ORDER BY SUM(oi.total) DESC
    LIMIT ${limit}
  `;
}

export async function fetchAnalyticsTopCategories(
  range: AnalyticsDateRange,
  limit: number,
): Promise<AnalyticsTopCategoryRow[]> {
  return db.$queryRaw<AnalyticsTopCategoryRow[]>`
    SELECT
      c.id AS "categoryId",
      COALESCE(SUM(oi.quantity), 0)::float AS "totalQuantity",
      COALESCE(SUM(oi.total), 0)::float AS "totalRevenue",
      COUNT(DISTINCT oi."orderId")::int AS "orderCount"
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi."orderId"
    INNER JOIN product_variants pv ON pv.id = oi."variantId"
    INNER JOIN products p ON p.id = pv."productId"
    INNER JOIN "_ProductCategories" pc ON pc."B" = p.id
    INNER JOIN categories c ON c.id = pc."A"
    WHERE o."createdAt" >= ${range.start}
      AND o."createdAt" <= ${range.end}
      AND p."deletedAt" IS NULL
    GROUP BY c.id
    ORDER BY SUM(oi.total) DESC
    LIMIT ${limit}
  `;
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

export function resolveTopProductImage(
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

export async function hydrateAnalyticsTopProducts(
  rows: AnalyticsTopProductRow[],
): Promise<
  Array<{
    variantId: string;
    productId: string;
    title: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
    image?: string | null;
  }>
> {
  if (rows.length === 0) {
    return [];
  }

  const variants = await db.productVariant.findMany({
    where: { id: { in: rows.map((row) => row.variantId) } },
    select: {
      id: true,
      productId: true,
      sku: true,
      imageUrl: true,
      product: {
        select: {
          media: true,
          translations: {
            where: { locale: "en" },
            take: 1,
            select: { title: true },
          },
        },
      },
    },
  });

  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  return rows.map((row) => {
    const variant = variantById.get(row.variantId);
    return {
      variantId: row.variantId,
      productId: variant?.productId ?? "",
      title: variant?.product?.translations?.[0]?.title ?? "Unknown Product",
      sku: variant?.sku ?? "N/A",
      totalQuantity: row.totalQuantity,
      totalRevenue: row.totalRevenue,
      orderCount: row.orderCount,
      image: resolveTopProductImage(
        variant?.product?.media as unknown[] | undefined,
        variant?.imageUrl,
      ),
    };
  });
}

export async function hydrateAnalyticsTopCategories(
  rows: AnalyticsTopCategoryRow[],
): Promise<
  Array<{
    categoryId: string;
    categoryName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>
> {
  if (rows.length === 0) {
    return [];
  }

  const categories = await db.category.findMany({
    where: { id: { in: rows.map((row) => row.categoryId) } },
    select: {
      id: true,
      translations: {
        where: { locale: "en" },
        take: 1,
        select: { title: true },
      },
    },
  });

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName:
      categoryById.get(row.categoryId)?.translations?.[0]?.title ?? row.categoryId,
    totalQuantity: row.totalQuantity,
    totalRevenue: row.totalRevenue,
    orderCount: row.orderCount,
  }));
}

export type AnalyticsSqlBlockTimings = Record<string, number>;

export async function measureAnalyticsBlock<T>(
  label: string,
  timings: AnalyticsSqlBlockTimings,
  run: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  const result = await run();
  timings[label] = Date.now() - started;
  return result;
}
