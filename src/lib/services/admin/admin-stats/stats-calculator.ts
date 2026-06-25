import { db } from "@white-shop/db";
import { logAdminStatsPerf } from "@/lib/admin/admin-perf-log";

const revenueWhere = {
  OR: [{ status: "completed" as const }, { paymentStatus: "paid" as const }],
};

interface OrderCountsRow {
  total: number;
  pending: number;
  recent: number;
}

async function fetchOrderCounts(sevenDaysAgo: Date): Promise<OrderCountsRow> {
  const rows = await db.$queryRaw<OrderCountsRow[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE "createdAt" >= ${sevenDaysAgo})::int AS recent
    FROM orders
  `;

  return rows[0] ?? { total: 0, pending: 0, recent: 0 };
}

async function fetchParallelDashboardMetrics(sevenDaysAgo: Date) {
  const blockTimings: Record<string, number> = {};
  const startedAt = Date.now();

  const [orderCounts, usersCount, productsCount, lowStockProducts, revenueAgg, currencySample] =
    await Promise.all([
      (async () => {
        const t0 = Date.now();
        const value = await fetchOrderCounts(sevenDaysAgo);
        blockTimings.orderCounts = Date.now() - t0;
        return value;
      })(),
      (async () => {
        const t0 = Date.now();
        const value = await db.user.count({ where: { deletedAt: null } });
        blockTimings.users = Date.now() - t0;
        return value;
      })(),
      (async () => {
        const t0 = Date.now();
        const value = await db.product.count({ where: { deletedAt: null } });
        blockTimings.products = Date.now() - t0;
        return value;
      })(),
      (async () => {
        const t0 = Date.now();
        const value = await db.productVariant.count({
          where: { stock: { lt: 10 }, published: true },
        });
        blockTimings.lowStock = Date.now() - t0;
        return value;
      })(),
      (async () => {
        const t0 = Date.now();
        const value = await db.order.aggregate({
          where: revenueWhere,
          _sum: { total: true },
        });
        blockTimings.revenue = Date.now() - t0;
        return value;
      })(),
      (async () => {
        const t0 = Date.now();
        const value = await db.order.findFirst({
          where: revenueWhere,
          select: { currency: true },
          orderBy: { createdAt: "desc" },
        });
        blockTimings.currency = Date.now() - t0;
        return value;
      })(),
    ]);

  logAdminStatsPerf({
    totalMs: Date.now() - startedAt,
    blocks: blockTimings,
  });

  return {
    orderCounts,
    usersCount,
    productsCount,
    lowStockProducts,
    revenueAgg,
    currencySample,
  };
}

function buildStatsResponse(
  metrics: Awaited<ReturnType<typeof fetchParallelDashboardMetrics>>,
) {
  return {
    users: { total: metrics.usersCount },
    products: { total: metrics.productsCount, lowStock: metrics.lowStockProducts },
    orders: {
      total: metrics.orderCounts.total,
      recent: metrics.orderCounts.recent,
      pending: metrics.orderCounts.pending,
    },
    revenue: {
      total: metrics.revenueAgg._sum.total ?? 0,
      currency: metrics.currencySample?.currency ?? "AMD",
    },
  };
}

/**
 * Get dashboard stats (parallel counts + DB-side revenue sum)
 */
export async function getStats() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const metrics = await fetchParallelDashboardMetrics(sevenDaysAgo);
  return buildStatsResponse(metrics);
}
