import { db } from "@white-shop/db";

/**
 * Get recent orders for dashboard
 */
export async function getRecentOrders(limit: number = 5) {
  const orders = await db.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  });

  return orders.map((order: { 
    id: string; 
    number: string; 
    status: string; 
    paymentStatus: string; 
    total: number; 
    currency: string | null; 
    customerEmail: string | null; 
    customerPhone: string | null; 
    createdAt: Date; 
    items: Array<unknown> 
  }) => ({
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    currency: order.currency,
    customerEmail: order.customerEmail || undefined,
    customerPhone: order.customerPhone || undefined,
    itemsCount: order.items.length,
    createdAt: order.createdAt.toISOString(),
  }));
}




