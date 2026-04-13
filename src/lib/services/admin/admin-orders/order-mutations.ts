import { db } from "@white-shop/db";
import { logger } from "../../../utils/logger";
import type { UpdateOrderData } from "./types";

/**
 * Delete order
 * Հեռացնում է պատվերը և բոլոր կապված գրառումները (cascade)
 */
export async function deleteOrder(orderId: string) {
  try {
    logger.info('Starting order deletion', { orderId });
    
    // Ստուգում ենք, արդյոք պատվերը գոյություն ունի
    const existing = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        _count: {
          select: {
            items: true,
            payments: true,
            events: true,
          },
        },
      },
    });

    if (!existing) {
      logger.warn('Order not found', { orderId });
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Order not found",
        detail: `Order with id '${orderId}' does not exist`,
      };
    }

    logger.info('Order found', {
      id: existing.id,
      number: existing.number,
      status: existing.status,
      total: existing.total,
      itemsCount: existing._count.items,
      paymentsCount: existing._count.payments,
      eventsCount: existing._count.events,
    });

    // Հեռացնում ենք պատվերը (cascade-ը ավտոմատ կհեռացնի կապված items, payments, events)
    try {
      await db.order.delete({
        where: { id: orderId },
      });
      logger.info('Order deleted successfully', { orderId, orderNumber: existing.number });
    } catch (deleteError: unknown) {
      const errorMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
      const errorCode = deleteError && typeof deleteError === 'object' && 'code' in deleteError ? String(deleteError.code) : '';
      logger.error('Prisma delete error', {
        code: errorCode,
        message: errorMessage,
      });
      throw deleteError;
    }
    
    return { success: true };
  } catch (error: unknown) {
    // Եթե սա մեր ստեղծած սխալ է, ապա վերադարձնում ենք այն
    if (error && typeof error === 'object' && 'status' in error && 'type' in error) {
      logger.error('Standard error', {
        status: (error as { status: number }).status,
        type: (error as { type: string }).type,
        title: (error as { title?: string }).title,
        detail: (error as { detail?: string }).detail,
      });
      throw error;
    }

    // Մանրամասն լոգավորում Prisma սխալների համար
    const errorObj = error as { name?: string; message?: string; code?: string; meta?: unknown; stack?: string };
    logger.error('Order deletion error', {
      orderId,
      error: {
        name: errorObj?.name,
        message: errorObj?.message,
        code: errorObj?.code,
        meta: errorObj?.meta,
        stack: errorObj?.stack?.substring(0, 500),
      },
    });

    // Prisma սխալների մշակում
    if (errorObj?.code === 'P2025') {
      // Record not found
      logger.warn('Prisma P2025: Record not found');
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Order not found",
        detail: `Order with id '${orderId}' does not exist`,
      };
    }

    if (errorObj?.code === 'P2003') {
      // Foreign key constraint failed
      logger.warn('Prisma P2003: Foreign key constraint');
      throw {
        status: 409,
        type: "https://api.shop.am/problems/conflict",
        title: "Cannot delete order",
        detail: "Order has related records that cannot be deleted",
      };
    }

    // Գեներիկ սխալ
    throw {
      status: 500,
      type: "https://api.shop.am/problems/internal-error",
      title: "Internal Server Error",
      detail: errorObj?.message || "Failed to delete order",
    };
  }
}

/**
 * Update order
 */
export async function updateOrder(orderId: string, data: UpdateOrderData) {
  try {
    // Check if order exists
    const existing = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Order not found",
        detail: `Order with id '${orderId}' does not exist`,
      };
    }

    // Validate status values
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    const validFulfillmentStatuses = ['unfulfilled', 'fulfilled', 'shipped', 'delivered'];

    if (data.status !== undefined && !validStatuses.includes(data.status)) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        detail: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      };
    }

    if (data.paymentStatus !== undefined && !validPaymentStatuses.includes(data.paymentStatus)) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        detail: `Invalid paymentStatus. Must be one of: ${validPaymentStatuses.join(', ')}`,
      };
    }

    if (data.fulfillmentStatus !== undefined && !validFulfillmentStatuses.includes(data.fulfillmentStatus)) {
      throw {
        status: 400,
        type: "https://api.shop.am/problems/validation-error",
        title: "Validation Error",
        detail: `Invalid fulfillmentStatus. Must be one of: ${validFulfillmentStatuses.join(', ')}`,
      };
    }

    // Prepare update data
    const updateData: {
      status?: string;
      paymentStatus?: string;
      fulfillmentStatus?: string;
      fulfilledAt?: Date;
      cancelledAt?: Date;
      paidAt?: Date;
    } = {};
    
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
    if (data.fulfillmentStatus !== undefined) updateData.fulfillmentStatus = data.fulfillmentStatus;

    // Update timestamps based on status changes
    if (data.status === 'completed' && existing.status !== 'completed') {
      updateData.fulfilledAt = new Date();
    }
    if (data.status === 'cancelled' && existing.status !== 'cancelled') {
      updateData.cancelledAt = new Date();
    }
    if (data.paymentStatus === 'paid' && existing.paymentStatus !== 'paid') {
      updateData.paidAt = new Date();
    }

    const order = await db.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
        payments: true,
      },
    });

    // Create order event
    await db.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'order_updated',
        data: {
          updatedFields: Object.keys(updateData),
          previousStatus: existing.status,
          newStatus: data.status || existing.status,
        },
      },
    });

    return order;
  } catch (error: unknown) {
    // If it's already our custom error, re-throw it
    if (error && typeof error === 'object' && 'status' in error && 'type' in error) {
      throw error;
    }

    // Log Prisma/database errors
    const errorObj = error as { name?: string; message?: string; code?: string; meta?: { cause?: string }; stack?: string };
    logger.error("updateOrder error", {
      orderId,
      error: {
        name: errorObj?.name,
        message: errorObj?.message,
        code: errorObj?.code,
        meta: errorObj?.meta,
        stack: errorObj?.stack?.substring(0, 500),
      },
    });

    // Handle specific Prisma errors
    if (errorObj?.code === 'P2025') {
      // Record not found
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Not Found",
        detail: errorObj?.meta?.cause || "The requested order was not found",
      };
    }

    // Generic database error
    throw {
      status: 500,
      type: "https://api.shop.am/problems/internal-error",
      title: "Database Error",
      detail: errorObj?.message || "An error occurred while updating the order",
    };
  }
}




