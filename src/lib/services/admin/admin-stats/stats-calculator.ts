import { db } from "@white-shop/db";

/**
 * Get dashboard stats
 */
export async function getStats() {
  // Count users
  const totalUsers = await db.user.count({
    where: { deletedAt: null },
  });

  // Count products
  const totalProducts = await db.product.count({
    where: { deletedAt: null },
  });

  // Count products with low stock (stock < 10)
  const lowStockProducts = await db.productVariant.count({
    where: {
      stock: { lt: 10 },
      published: true,
    },
  });

  // Count orders
  const totalOrders = await db.order.count();

  // Count recent orders (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentOrders = await db.order.count({
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
  });

  // Count pending orders
  const pendingOrders = await db.order.count({
    where: { status: "pending" },
  });

  // Calculate total revenue from completed/paid orders
  const completedOrders = await db.order.findMany({
    where: {
      OR: [
        { status: "completed" },
        { paymentStatus: "paid" },
      ],
    },
    select: {
      total: true,
      currency: true,
    },
  });

  const totalRevenue = completedOrders.reduce((sum: number, order: { total: number; currency: string | null }) => sum + order.total, 0);
  const currency = completedOrders[0]?.currency || "AMD";

  return {
    users: {
      total: totalUsers,
    },
    products: {
      total: totalProducts,
      lowStock: lowStockProducts,
    },
    orders: {
      total: totalOrders,
      recent: recentOrders,
      pending: pendingOrders,
    },
    revenue: {
      total: totalRevenue,
      currency,
    },
  };
}




