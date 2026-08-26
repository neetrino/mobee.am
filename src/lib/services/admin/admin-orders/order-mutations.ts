import { AppError } from "@/lib/errors/app-error";
import { aggregateQuantitiesByVariantId } from "../../inventory/aggregate-variant-quantities";
import { deleteEmptyOrder } from "../../orders/delete-empty-order";
import { updateOrderStatuses } from "../../orders/order-transition.service";
import type { CommerceRequestContext } from "../../orders/order-transition.types";
import type { UpdateOrderData } from "./types";

export function buildStockAdjustmentsForCancel(
  items: Array<{ variantId: string; quantity: number }>,
) {
  return aggregateQuantitiesByVariantId(items);
}

/**
 * Delete empty test orders only. Commerce orders with items or payments must be cancelled.
 */
export async function deleteOrder(orderId: string, context: CommerceRequestContext) {
  return deleteEmptyOrder(orderId, context);
}

/**
 * Update order statuses through the commerce FSM.
 */
export async function updateOrder(
  orderId: string,
  data: UpdateOrderData,
  context: CommerceRequestContext,
) {
  const order = await updateOrderStatuses(orderId, data, context);
  if (!order) {
    throw AppError.notFound(`Order with id '${orderId}' does not exist`);
  }
  return order;
}
