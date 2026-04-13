import { getStats } from "./admin-stats/stats-calculator";
import { getUserActivity } from "./admin-stats/user-activity";
import { getRecentOrders } from "./admin-stats/recent-orders";
import { getTopProducts } from "./admin-stats/top-products";
import { getActivity } from "./admin-stats/activity";
import { getAnalytics } from "./admin-stats/analytics";

/**
 * Service for admin statistics operations
 */
class AdminStatsService {
  /**
   * Get dashboard stats
   */
  async getStats() {
    return getStats();
  }

  /**
   * Get user activity (recent registrations and active users)
   */
  async getUserActivity(limit: number = 10) {
    return getUserActivity(limit);
  }

  /**
   * Get recent orders for dashboard
   */
  async getRecentOrders(limit: number = 5) {
    return getRecentOrders(limit);
  }

  /**
   * Get top products for dashboard
   */
  async getTopProducts(limit: number = 5) {
    return getTopProducts(limit);
  }

  /**
   * Get recent activity for dashboard
   */
  async getActivity(limit: number = 10) {
    return getActivity(limit);
  }

  /**
   * Get analytics data
   */
  async getAnalytics(period: string = 'week', startDate?: string, endDate?: string) {
    return getAnalytics(period, startDate, endDate);
  }
}

export const adminStatsService = new AdminStatsService();
