import { getStats } from "./stats-calculator";
import { getRecentOrders } from "./recent-orders";
import { getTopProducts } from "./top-products";
import { getUserActivity } from "./user-activity";
import type { AdminStatsSummary } from "@/lib/contracts/admin-analytics";

export interface AdminDashboardBundleOptions {
  recentOrdersLimit?: number;
  topProductsLimit?: number;
  userActivityLimit?: number;
}

export interface AdminDashboardBundle {
  stats: AdminStatsSummary | null;
  recentOrders: Awaited<ReturnType<typeof getRecentOrders>>;
  topProducts: Awaited<ReturnType<typeof getTopProducts>>;
  userActivity: Awaited<ReturnType<typeof getUserActivity>> | null;
}

const DEFAULT_RECENT_ORDERS_LIMIT = 5;
const DEFAULT_TOP_PRODUCTS_LIMIT = 5;
const DEFAULT_USER_ACTIVITY_LIMIT = 10;

/**
 * Loads all dashboard sections in parallel.
 * Uses Promise.allSettled so one failing section does not block the rest (partial data).
 */
export async function getDashboardBundle(
  options: AdminDashboardBundleOptions = {},
): Promise<AdminDashboardBundle> {
  const recentOrdersLimit = options.recentOrdersLimit ?? DEFAULT_RECENT_ORDERS_LIMIT;
  const topProductsLimit = options.topProductsLimit ?? DEFAULT_TOP_PRODUCTS_LIMIT;
  const userActivityLimit = options.userActivityLimit ?? DEFAULT_USER_ACTIVITY_LIMIT;

  const [statsResult, recentOrdersResult, topProductsResult, userActivityResult] =
    await Promise.allSettled([
      getStats(),
      getRecentOrders(recentOrdersLimit),
      getTopProducts(topProductsLimit),
      getUserActivity(userActivityLimit),
    ]);

  return {
    stats: statsResult.status === "fulfilled" ? statsResult.value : null,
    recentOrders:
      recentOrdersResult.status === "fulfilled" ? recentOrdersResult.value : [],
    topProducts:
      topProductsResult.status === "fulfilled" ? topProductsResult.value : [],
    userActivity:
      userActivityResult.status === "fulfilled" ? userActivityResult.value : null,
  };
}
