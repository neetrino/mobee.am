import { getOrders, getOrderById } from "./admin-orders/order-operations";
import { deleteOrder, updateOrder } from "./admin-orders/order-mutations";
import type { OrderFilters, UpdateOrderData } from "./admin-orders/types";

/**
 * Service for admin order operations
 */
class AdminOrdersService {
  /**
   * Get orders with filters and pagination
   */
  async getOrders(filters: OrderFilters = {}) {
    return getOrders(filters);
  }

  /**
   * Get single order by ID with full details for admin
   */
  async getOrderById(orderId: string) {
    return getOrderById(orderId);
  }

  /**
   * Delete order
   * Հեռացնում է պատվերը և բոլոր կապված գրառումները (cascade)
   */
  async deleteOrder(orderId: string) {
    return deleteOrder(orderId);
  }

  /**
   * Update order
   */
  async updateOrder(orderId: string, data: UpdateOrderData) {
    return updateOrder(orderId, data);
  }
}

export const adminOrdersService = new AdminOrdersService();
