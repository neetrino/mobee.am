import { db } from "@white-shop/db";

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
    lastLoginAt: undefined,
  };
}

function formatActiveUserFromAgg(
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
  },
  metrics: { orderCount: number; totalSpent: number; lastOrderDate: Date }
) {
  return {
    id: user.id,
    email: user.email || undefined,
    phone: user.phone || undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.phone || "Unknown",
    orderCount: metrics.orderCount,
    totalSpent: metrics.totalSpent,
    lastOrderDate: metrics.lastOrderDate.toISOString(),
    lastLoginAt: undefined,
  };
}

async function loadRecentRegistrations(limit: number) {
  const recentUsers = await db.user.findMany({
    where: { deletedAt: null },
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
  return recentUsers.map(formatUser);
}

async function loadActiveUsersBySpend(limit: number) {
  const orderMetrics = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { not: null } },
    _count: { id: true },
    _sum: { total: true },
    _max: { createdAt: true },
    orderBy: { _sum: { total: "desc" } },
    take: limit,
  });

  const userIds = orderMetrics.map((row) => row.userId).filter((id): id is string => id !== null);
  if (userIds.length === 0) return [];

  const users = await db.user.findMany({
    where: { id: { in: userIds }, deletedAt: null },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return orderMetrics
    .map((row) => {
      const uid = row.userId;
      if (!uid) return null;
      const u = userById.get(uid);
      if (!u) return null;
      const lastOrder = row._max.createdAt ?? u.createdAt;
      return formatActiveUserFromAgg(u, {
        orderCount: row._count.id,
        totalSpent: row._sum.total ?? 0,
        lastOrderDate: lastOrder,
      });
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/**
 * Get user activity (recent registrations and active users)
 */
export async function getUserActivity(limit: number = 10) {
  const recentRegistrations = await loadRecentRegistrations(limit);
  const activeUsers = await loadActiveUsersBySpend(limit);
  return { recentRegistrations, activeUsers };
}
