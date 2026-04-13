import { db } from "@white-shop/db";

/**
 * Activity item interface
 */
export interface ActivityItem {
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

/**
 * Get recent activity for dashboard
 */
export async function getActivity(limit: number = 10): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];

  // Get recent orders
  const recentOrders = await db.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
    },
  });

  recentOrders.forEach((order: { 
    number: string; 
    items: Array<unknown>; 
    total: number; 
    currency: string | null; 
    createdAt: Date 
  }) => {
    activities.push({
      type: "order",
      title: `New Order #${order.number}`,
      description: `${order.items.length} items • ${order.total} ${order.currency}`,
      timestamp: order.createdAt.toISOString(),
    });
  });

  // Get recent user registrations
  const recentUsers = await db.user.findMany({
    take: Math.floor(limit / 2),
    orderBy: { createdAt: "desc" },
    where: { deletedAt: null },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  recentUsers.forEach((user: { 
    firstName: string | null; 
    lastName: string | null; 
    email: string | null; 
    phone: string | null; 
    createdAt: Date 
  }) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.phone || "New User";
    activities.push({
      type: "user",
      title: "New User Registration",
      description: name,
      timestamp: user.createdAt.toISOString(),
    });
  });

  // Sort by timestamp (most recent first) and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}




