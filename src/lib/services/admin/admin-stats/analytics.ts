import {
  normalizeCurrencyCode,
  type AdminAnalyticsData,
  type AdminAnalyticsPeriod,
} from "@/lib/contracts/admin-analytics";
import { logAdminAnalyticsPerf } from "@/lib/admin/admin-perf-log";
import {
  calculateDateRange,
} from "./analytics-date-range";
import {
  fetchAnalyticsOrdersByDay,
  fetchAnalyticsOrdersCurrency,
  fetchAnalyticsOrdersSummary,
  fetchAnalyticsTopCategories,
  fetchAnalyticsTopProducts,
  hydrateAnalyticsTopCategories,
  hydrateAnalyticsTopProducts,
  measureAnalyticsBlock,
  type AnalyticsSqlBlockTimings,
} from "./analytics-queries";

const TOP_ANALYTICS_LIMIT = 10;

/**
 * Get analytics data (SQL aggregates, no deep order graph loading).
 */
export async function getAnalytics(
  period: AdminAnalyticsPeriod = "week",
  startDate?: string,
  endDate?: string,
): Promise<AdminAnalyticsData> {
  const { start, end } = calculateDateRange(period, startDate, endDate);
  const range = { start, end };
  const blockTimings: AnalyticsSqlBlockTimings = {};
  const startedAt = Date.now();

  const [ordersSummary, ordersCurrency, ordersByDay, topProductRows, topCategoryRows] =
    await Promise.all([
      measureAnalyticsBlock("ordersSummary", blockTimings, () =>
        fetchAnalyticsOrdersSummary(range),
      ),
      measureAnalyticsBlock("ordersCurrency", blockTimings, () =>
        fetchAnalyticsOrdersCurrency(range),
      ),
      measureAnalyticsBlock("ordersByDay", blockTimings, () =>
        fetchAnalyticsOrdersByDay(range),
      ),
      measureAnalyticsBlock("topProductsSql", blockTimings, () =>
        fetchAnalyticsTopProducts(range, TOP_ANALYTICS_LIMIT),
      ),
      measureAnalyticsBlock("topCategoriesSql", blockTimings, () =>
        fetchAnalyticsTopCategories(range, TOP_ANALYTICS_LIMIT),
      ),
    ]);

  const [topProducts, topCategories] = await Promise.all([
    measureAnalyticsBlock("topProductsHydrate", blockTimings, () =>
      hydrateAnalyticsTopProducts(topProductRows),
    ),
    measureAnalyticsBlock("topCategoriesHydrate", blockTimings, () =>
      hydrateAnalyticsTopCategories(topCategoryRows),
    ),
  ]);

  logAdminAnalyticsPerf(period, {
    totalMs: Date.now() - startedAt,
    blocks: blockTimings,
  });

  return {
    period,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    orders: {
      totalOrders: ordersSummary.totalOrders,
      totalRevenue: ordersSummary.totalRevenue,
      paidOrders: ordersSummary.paidOrders,
      pendingOrders: ordersSummary.pendingOrders,
      completedOrders: ordersSummary.completedOrders,
      currency: normalizeCurrencyCode(ordersCurrency),
    },
    topProducts,
    topCategories,
    ordersByDay,
  };
}
