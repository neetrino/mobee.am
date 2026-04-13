import { db } from "@white-shop/db";

/**
 * Format user for activity response
 */
function formatUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email || undefined,
    phone: user.phone || undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.phone || "Unknown",
    registeredAt: user.createdAt.toISOString(),
    lastLoginAt: undefined, // We don't track last login yet
  };
}

/**
 * Format active user for activity response
 */
function formatActiveUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  orders: Array<{
    id: string;
    total: number;
    createdAt: Date;
  }>;
}) {
  const orders = Array.isArray(user.orders) ? user.orders : [];
  const orderCount = orders.length;
  const totalSpent = orders.reduce((sum: number, order: { total: number }) => sum + order.total, 0);
  const lastOrder = orders[0] || null;

  return {
    id: user.id,
    email: user.email || undefined,
    phone: user.phone || undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.phone || "Unknown",
    orderCount,
    totalSpent,
    lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : user.createdAt.toISOString(),
    lastLoginAt: undefined, // We don't track last login yet
  };
}

/**
 * Get user activity (recent registrations and active users)
 */
export async function getUserActivity(limit: number = 10) {
  // Get recent registrations
  const recentUsers = await db.user.findMany({
    where: {
      deletedAt: null,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });

  const recentRegistrations = recentUsers.map(formatUser);

  // Get active users (users with orders)
  const usersWithOrders = await db.user.findMany({
    where: {
      deletedAt: null,
      orders: {
        some: {},
      },
    },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      orders: {
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    take: limit,
  });

  const activeUsers = usersWithOrders.map(formatActiveUser);

  return {
    recentRegistrations,
    activeUsers,
  };
}




