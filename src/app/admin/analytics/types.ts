export interface AnalyticsData {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  orders: {
    totalOrders: number;
    totalRevenue: number;
    paidOrders: number;
    pendingOrders: number;
    completedOrders: number;
  };
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

export interface AdminStatsSummary {
  users?: {
    total?: number;
  };
}




