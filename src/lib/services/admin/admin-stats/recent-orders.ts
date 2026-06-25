import { db } from "@white-shop/db";

/**
 * Get recent orders for dashboard
 */
export async function getRecentOrders(limit: number = 5) {
  const orders = await db.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      paymentStatus: true,
      total: true,
      currency: true,
      customerEmail: true,
      customerPhone: true,
      createdAt: true,
      _count: {
        select: { items: true },
      },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    currency: order.currency,
    customerEmail: order.customerEmail || undefined,
    customerPhone: order.customerPhone || undefined,
    itemsCount: order._count.items,
    createdAt: order.createdAt.toISOString(),
  }));
}




