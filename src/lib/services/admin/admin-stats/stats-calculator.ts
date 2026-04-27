import { db } from "@white-shop/db";

const revenueWhere = {
  OR: [{ status: "completed" as const }, { paymentStatus: "paid" as const }],
};

async function fetchParallelDashboardMetrics(sevenDaysAgo: Date) {
  return Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.product.count({ where: { deletedAt: null } }),
    db.productVariant.count({
      where: { stock: { lt: 10 }, published: true },
    }),
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.order.count({ where: { status: "pending" } }),
    db.order.aggregate({
      where: revenueWhere,
      _sum: { total: true },
    }),
    db.order.findFirst({
      where: revenueWhere,
      select: { currency: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
}

function buildStatsResponse(
  rows: Awaited<ReturnType<typeof fetchParallelDashboardMetrics>>
) {
  const [
    totalUsers,
    totalProducts,
    lowStockProducts,
    totalOrders,
    recentOrders,
    pendingOrders,
    revenueAgg,
    currencySample,
  ] = rows;

  return {
    users: { total: totalUsers },
    products: { total: totalProducts, lowStock: lowStockProducts },
    orders: {
      total: totalOrders,
      recent: recentOrders,
      pending: pendingOrders,
    },
    revenue: {
      total: revenueAgg._sum.total ?? 0,
      currency: currencySample?.currency ?? "AMD",
    },
  };
}

/**
 * Get dashboard stats (parallel counts + DB-side revenue sum)
 */
export async function getStats() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const rows = await fetchParallelDashboardMetrics(sevenDaysAgo);
  return buildStatsResponse(rows);
}
