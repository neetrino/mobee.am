import { db } from "@white-shop/db";

/**
 * Calculate date range based on period
 */
function calculateDateRange(period: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  let start: Date;
  let end: Date = new Date();
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
      }
      break;
    default:
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * Calculate top products from orders
 */
function calculateTopProducts(orders: Array<{
  items: Array<{
    variantId: string | null;
    variant?: {
      product?: {
        id: string;
        translations?: Array<{ title: string }>;
        media?: Array<{ url?: string }>;
      };
    } | null;
    productTitle?: string;
    sku?: string;
    quantity: number;
    total: number;
  }>;
}>): Array<{
  variantId: string;
  productId: string;
  title: string;
  sku: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
  image?: string | null;
}> {
  const productMap = new Map<string, {
    variantId: string;
    productId: string;
    title: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
    image?: string | null;
  }>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.variantId) {
        const key = item.variantId;
        const existing = productMap.get(key) || {
          variantId: item.variantId,
          productId: item.variant?.product?.id || '',
          title: item.productTitle || 'Unknown Product',
          sku: item.sku || 'N/A',
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0,
          image: null,
        };
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.total;
        existing.orderCount += 1;
        productMap.set(key, existing);
      }
    });
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
}

/**
 * Calculate top categories from orders
 */
function calculateTopCategories(orders: Array<{
  items: Array<{
    variant?: {
      product?: {
        categories: Array<{
          id: string;
          translations?: Array<{ title: string }>;
        }>;
      };
    };
    quantity: number;
    total: number;
  }>;
}>): Array<{
  categoryId: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}> {
  const categoryMap = new Map<string, {
    categoryId: string;
    categoryName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.variant?.product) {
        item.variant.product.categories.forEach((category) => {
          const categoryId = category.id;
          const translations = category.translations || [];
          const categoryName = translations[0]?.title || category.id;
          const existing = categoryMap.get(categoryId) || {
            categoryId,
            categoryName,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
          };
          existing.totalQuantity += item.quantity;
          existing.totalRevenue += item.total;
          existing.orderCount += 1;
          categoryMap.set(categoryId, existing);
        });
      }
    });
  });

  return Array.from(categoryMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
}

/**
 * Calculate orders by day
 */
function calculateOrdersByDay(orders: Array<{
  createdAt: Date;
  paymentStatus: string;
  total: number;
}>): Array<{
  _id: string;
  count: number;
  revenue: number;
}> {
  const ordersByDayMap = new Map<string, { count: number; revenue: number }>();

  orders.forEach((order) => {
    const dateKey = order.createdAt.toISOString().split('T')[0];
    const existing = ordersByDayMap.get(dateKey) || { count: 0, revenue: 0 };
    existing.count += 1;
    if (order.paymentStatus === 'paid') {
      existing.revenue += order.total;
    }
    ordersByDayMap.set(dateKey, existing);
  });

  return Array.from(ordersByDayMap.entries())
    .map(([date, data]) => ({
      _id: date,
      count: data.count,
      revenue: data.revenue,
    }))
    .sort((a, b) => a._id.localeCompare(b._id));
}

/**
 * Get analytics data
 */
export async function getAnalytics(period: string = 'week', startDate?: string, endDate?: string) {
  const { start, end } = calculateDateRange(period, startDate, endDate);

  // Get orders in date range
  const orders = await db.order.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  translations: {
                    where: { locale: 'en' },
                    take: 1,
                  },
                  categories: {
                    include: {
                      translations: {
                        where: { locale: 'en' },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Calculate order statistics
  const totalOrders = orders.length;
  const paidOrders = orders.filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid').length;
  const pendingOrders = orders.filter((o: { status: string }) => o.status === 'pending').length;
  const completedOrders = orders.filter((o: { status: string }) => o.status === 'completed').length;
  const totalRevenue = orders
    .filter((o: { paymentStatus: string }) => o.paymentStatus === 'paid')
    .reduce((sum: number, o: { total: number }) => sum + o.total, 0);

  // Calculate top products
  const topProducts = calculateTopProducts(orders as Parameters<typeof calculateTopProducts>[0]);

  // Calculate top categories
  const topCategories = calculateTopCategories(orders as Parameters<typeof calculateTopCategories>[0]);

  // Calculate orders by day
  const ordersByDay = calculateOrdersByDay(orders);

  return {
    period,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    orders: {
      totalOrders,
      totalRevenue,
      paidOrders,
      pendingOrders,
      completedOrders,
    },
    topProducts,
    topCategories,
    ordersByDay,
  };
}




