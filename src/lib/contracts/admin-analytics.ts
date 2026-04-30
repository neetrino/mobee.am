export const ADMIN_ANALYTICS_PERIODS = ["day", "week", "month", "year", "custom"] as const;

export type AdminAnalyticsPeriod = (typeof ADMIN_ANALYTICS_PERIODS)[number];

export interface AdminStatsSummary {
  users: { total: number };
  products: { total: number; lowStock: number };
  orders: { total: number; recent: number; pending: number };
  revenue: { total: number; currency: string };
}

export interface AdminAnalyticsOrdersSummary {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  completedOrders: number;
  currency: string;
}

export interface AdminAnalyticsData {
  period: AdminAnalyticsPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  orders: AdminAnalyticsOrdersSummary;
  topProducts: Array<{
    variantId: string;
    productId: string;
    title: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
    image?: string | null;
  }>;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>;
  ordersByDay: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
}

export function normalizeCurrencyCode(input: string | null | undefined): string {
  const sanitized = input?.trim().toUpperCase();
  if (!sanitized || sanitized.length !== 3) {
    return "AMD";
  }
  return sanitized;
}
